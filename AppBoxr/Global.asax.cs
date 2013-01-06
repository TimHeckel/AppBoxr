using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Mvc;
using System.Web.Routing;
using Microsoft.AspNet.SignalR.Hubs;
using Microsoft.AspNet.SignalR;
using System.Threading.Tasks;
using Newtonsoft.Json;
using MongoDB.Bson;

namespace AppBoxr
{
    public class Global : System.Web.HttpApplication
    {
        public static void RegisterGlobalFilters(GlobalFilterCollection filters)
        {
            filters.Add(new HandleErrorAttribute());
        }

        public static void RegisterRoutes(RouteCollection routes)
        {
            routes.IgnoreRoute("{resource}.axd/{*pathInfo}");
            routes.IgnoreRoute("favicon.ico");

            routes.MapHttpRoute(
               name: "RESTApi",
               routeTemplate: "api/{hub}/{collection}",
               defaults: new { hub = "appboxr", controller = "AppBoxr" }
            );
        }

        protected void Application_Start(object sender, EventArgs e)
        {
            AreaRegistration.RegisterAllAreas();
            RegisterGlobalFilters(GlobalFilters.Filters);
            RegisterRoutes(RouteTable.Routes);
            RouteTable.Routes.MapHubs();

            var config = GlobalConfiguration.Configuration;
            config.Formatters.Remove(config.Formatters.XmlFormatter);
            config.IncludeErrorDetailPolicy = IncludeErrorDetailPolicy.Always;

            //or not?
            config.Formatters.JsonFormatter.SerializerSettings.DateFormatHandling = DateFormatHandling.MicrosoftDateFormat;

            GlobalHost.DependencyResolver.Register(typeof(IDataLayer), () => new MongoDataLayer());
            GlobalHost.DependencyResolver.Register(typeof(IHubDescriptorProvider), () => new RelayDescriptorProvider());
            GlobalHost.DependencyResolver.Register(typeof(IMethodDescriptorProvider), () => new RelayMethodDescriptorProvider());
        }
    }
}