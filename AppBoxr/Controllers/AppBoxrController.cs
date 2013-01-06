using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;
using Newtonsoft.Json;

namespace AppBoxr.Controllers
{
    /// <summary>
    /// Invoke the dynamic HUB to return json data
    /// as a RESTful API over the top of the models
    /// </summary>
    public class AppBoxrController : ApiController
    {
        [HttpGet]
        public HttpResponseMessage Get(string collection, string id = "", string orderby = "", string query = "", string fields = "", string hub = "appboxr")
        {
            var _repo = GlobalHost.DependencyResolver.Resolve<IDataLayer>();
            var _all = _repo.Get(new List<dynamic>() { new { collection = collection, fields = fields.Split(','), orderby = orderby, query = query, contextid = "API" } });
            var _dyn = new { contextid = "", results = new List<dynamic>() };
            var _res = JsonConvert.DeserializeAnonymousType(_all.First().ToString(), _dyn);

            //no client notification needed as this is only an external GET

            return this.Request.CreateResponse(
                HttpStatusCode.OK
                , (List<dynamic>)_res.results
            );
        }

        [HttpDelete]
        public HttpResponseMessage Delete(string collection, string ids, string hub = "appboxr")
        {
            var _repo = GlobalHost.DependencyResolver.Resolve<IDataLayer>();
            var _ids = ids.Split(',');
            List<string> wrapped = new List<string>();
            foreach (var id in _ids)
                wrapped.Add("{ \"$oid\": \"" + id.Replace("\"", "") + "\"}");

            var _res = _repo.Delete(new { collection = collection, ids = String.Concat("[", String.Join(",", wrapped), "]") });

            //notify user UIs of the delete
            var c = GlobalHost.ConnectionManager.GetHubContext(hub);
            c.Clients.All.process(new { appBoxr = new { process = new { top = "DELETE" } } });

            return this.Request.CreateResponse(
               HttpStatusCode.OK
               , _res
            );
        }

        [HttpPost]
        public HttpResponseMessage Save(string collection, dynamic obj, string hub = "appboxr")
        {
            var _repo = GlobalHost.DependencyResolver.Resolve<IDataLayer>();
            var _pst = new List<dynamic>() { new { collection = collection, model = obj } };
            var _ids = _repo.Save(JsonConvert.SerializeObject(_pst));

            //notify user UIs of the save
            var c = GlobalHost.ConnectionManager.GetHubContext(hub);
            c.Clients.All.process(new { appBoxr = new { models = _pst, process = new { top = "SAVE", opts = new { rebindTemplates = true, resetUI = false } } } });

            return this.Request.CreateResponse(
               HttpStatusCode.OK
               , _ids.First()
            );
        }
    }
}
