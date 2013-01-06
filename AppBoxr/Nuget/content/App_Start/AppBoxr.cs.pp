using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Routing;
using Microsoft.Web.Infrastructure;
using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;
using System.Web.Http;
using AppBoxr;

[assembly: WebActivator.PreApplicationStartMethod(typeof($rootnamespace$.App_Start.AppBoxr), "PreStart")]
[assembly: WebActivator.PostApplicationStartMethod(typeof($rootnamespace$.App_Start.AppBoxr), "PostStart")]

namespace $rootnamespace$.App_Start {
    public static class AppBoxr {

		public static void PreStart() {
			//this needs to be above any routes.MapRoute call
			RouteTable.Routes.MapHubs();
			RegisterRoutes(RouteTable.Routes);
		}

        public static void PostStart() {

		    AreaRegistration.RegisterAllAreas();
            RegisterGlobalFilters(GlobalFilters.Filters);

            var config = GlobalConfiguration.Configuration;
            config.Formatters.Remove(config.Formatters.XmlFormatter);
            config.IncludeErrorDetailPolicy = IncludeErrorDetailPolicy.Always;

            GlobalHost.DependencyResolver.Register(typeof(IDataLayer), () => new MongoDataLayer());
            GlobalHost.DependencyResolver.Register(typeof(IHubDescriptorProvider), () => new AppBoxrDescriptorProvider());
            GlobalHost.DependencyResolver.Register(typeof(IMethodDescriptorProvider), () => new AppBoxrMethodDescriptorProvider());
        }

		public static void RegisterGlobalFilters(GlobalFilterCollection filters)
        {
            filters.Add(new HandleErrorAttribute());
        }
 
        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");
            routes.IgnoreRoute("favicon.ico");

            routes.MapHttpRoute(
               name: "AppBoxrRESTApi",
               routeTemplate: "{hub}/{collection}",
               defaults: new { controller = "AppBoxr", hub = "AppBoxr" }
            );

			/* ADD additional routes here */
        }
    }
}