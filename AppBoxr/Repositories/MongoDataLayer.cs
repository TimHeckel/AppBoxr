using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using MongoDB.Driver;
using System.Configuration;
using MongoDB.Bson;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.IO;

namespace AppBoxr
{
    public class MongoDataLayer: IDataLayer
    {
        private string _hub = "";
        public MongoDataLayer(string hub = "")
        {
            _hub = hub;
        }

        MongoDatabase _db
        {
            get
            {
                if (!String.IsNullOrEmpty(_hub))
                    return MongoDatabase.Create(String.Format(ConfigurationManager.AppSettings["AppBoxr-{0}-MongoDBUrl"], _hub));

                return MongoDatabase.Create(ConfigurationManager.AppSettings["AppBoxr-MongoDBUrl"]);               
            }
        }

        public IEnumerable<dynamic> Get(dynamic queries)
        {
            List<dynamic> _docs = new List<dynamic>();
            foreach (var q in queries)
            {
                string _coll = q.collection.ToString();
                string _query = "";
                string _orderby = "";

                List<string> _fields = new List<string>();
                if (q.fields != null)
                    foreach (var f in q.fields)
                        if (!String.IsNullOrEmpty(f))
                            _fields.Add(f.ToString());

                if (q.query != null)
                    _query = q.query.ToString();

                if (q.orderby != null)
                    _orderby = q.orderby.ToString();

                var col = _db.GetCollection(_coll);
                var _results = col.GetItems<BsonDocument>(_fields, _query, _orderby);

                var cid = (q.contextid != null) ? q.contextid : "";

                //ensures that the objectid is not part of the json string
                var _settings = new JsonWriterSettings { OutputMode = JsonOutputMode.Strict };
                var _res = new { contextid = cid, results = JsonConvert.DeserializeObject<dynamic>(_results.ToJson(_settings)) };
                dynamic doc = JsonConvert.DeserializeObject<dynamic>(JsonConvert.SerializeObject(_res));

                _docs.Add(doc);
            }

            return _docs;
        }

        public IEnumerable<string> Save(dynamic models)
        {
            List<string> ids = new List<string>();
            var _models = JsonConvert.DeserializeObject<List<dynamic>>(models);
            foreach (var m in _models)
            {
                string _json = m.model.ToString();
                var _collection = m.collection.ToString();

                MongoCollection _coll = _db.GetCollection(_collection);

                var doc = BsonSerializer.Deserialize<BsonDocument>(_json);
                doc.Add(new BsonElement("Modified", BsonValue.Create(DateTime.UtcNow)));

                _coll.Save(doc);
                ids.Add(doc["_id"].ToString());
            }

            return ids;
        }

        public bool Delete(dynamic lookup)
        {
            var _qs = lookup.ids as string;
            string query = String.Concat("{ \"_id\":", "{ \"$in\": " + _qs + " } }");
            var _query = new QueryDocument(BsonSerializer.Deserialize<BsonDocument>(query));
            var _coll = _db.GetCollection(lookup.collection.ToString());
            _coll.Remove(_query);
            return true;
        }
    }
}