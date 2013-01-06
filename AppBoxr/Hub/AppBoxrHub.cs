using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.AspNet.SignalR.Hubs;
using Microsoft.AspNet.SignalR;
using System.Threading.Tasks;

namespace AppBoxr
{
    public class AuthAttribute : Attribute, IAuthorizeHubMethodInvocation
    {
        public bool AuthorizeHubMethodInvocation(IHubIncomingInvokerContext hubIncomingInvokerContext)
        {
            return true;
        }
    }

    public class AppBoxrMethodDescriptorProvider : IMethodDescriptorProvider
    {
        public IEnumerable<MethodDescriptor> GetMethods(HubDescriptor hub)
        {
            return Enumerable.Empty<MethodDescriptor>();
        }

        public bool TryGetMethod(HubDescriptor hub, string method, out MethodDescriptor descriptor, params IJsonValue[] parameters)
        {
            descriptor = new MethodDescriptor
            {
                Hub = hub,
                Invoker = (h, args) =>
                {
                    var pkg = ((dynamic)args[0]);

                    //default to broadcast only to others
                    IClientProxy proxy = h.Clients.Others;
                    if (pkg.recipients == "ALL")
                        proxy = h.Clients.All;
                    else if (pkg.recipients == "SELF")
                        proxy = h.Clients.Caller;

                    var _appId = h.Context.ConnectionId;
                    dynamic _op = false;


                    //How to deal with concurrent requests?
                    //This is the derby/racer conflict resolution problem
                    //Like -- what if two users perform an update at the same time?
                    //For now, the broadcast is just sent to all....
                    //but an in-out pub/sub redis store that caches the requests
                    //and only executes the LAST one might be a simple solution

                    if (pkg.appBoxr != null)
                    {
                        var _clientId = pkg.clientId.ToString();
                        var _repo = GlobalHost.DependencyResolver.Resolve<IDataLayer>();
                        var appBoxr = (dynamic)pkg.appBoxr;

                        string process = appBoxr.process.top.ToString();

                        if (process == "GET")
                        {
                            _op = _repo.Get(appBoxr.queries);
                        }
                        else if (process == "SAVE")
                        {
                            _op = _repo.Save(appBoxr.models.ToString());
                        }
                        else if (process == "DELETE")
                        {
                            _op = _repo.Delete(new { ids = appBoxr.ids.ToString(), collection = appBoxr.collection });
                        }
                    }

                    //result is always 2nd param of GET SAVE and DELETE ops
                    return proxy.Invoke(method, pkg, _op);
                },
                Name = method,
                Attributes = new List<AuthAttribute>() { new AuthAttribute() },
                Parameters = Enumerable.Range(0, parameters.Length).Select(i => new Microsoft.AspNet.SignalR.Hubs.ParameterDescriptor { Name = "p_" + i, ParameterType = typeof(object) }).ToArray(),
                ReturnType = typeof(Task)
            };

            return true;
        }
    }

    /// <summary>
    /// Allows dynamic hub discovery
    /// </summary>
    public class AppBoxrDescriptorProvider : IHubDescriptorProvider
    {
        public IList<HubDescriptor> GetHubs()
        {
            return new List<HubDescriptor>();
        }

        /// <summary>
        /// Returns a hub descriptor for the spec
        /// </summary>
        /// <param name="hubName"></param>
        /// <param name="descriptor"></param>
        /// <returns></returns>
        public bool TryGetHub(string hubName, out HubDescriptor descriptor)
        {
            descriptor = new HubDescriptor { Name = hubName, HubType = typeof(AppBoxrHub) };
            return true;
        }

        public class AppBoxrHub : Hub
        {
            public Task Connect()
            {
                return null;
            }
        }
    }
}