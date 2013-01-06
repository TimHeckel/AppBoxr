using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using MongoDB.Driver;
using MongoDB.Bson.Serialization;
using MongoDB.Bson;
using MongoDB.Driver.Builders;
using MongoDB.Driver.Wrappers;
using System.Collections;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace AppBoxr
{
    public static class Data
    {

        //http://stackoverflow.com/questions/6120629/can-i-do-a-text-query-with-the-mongodb-c-sharp-driver
        public static List<T> GetItems<T>(this MongoCollection collection,
                        List<string> fields, string queryString, string orderString) where T : class
        {
            string _qs = String.IsNullOrEmpty(queryString) ? "{}" : queryString;
            string _ob = String.IsNullOrEmpty(orderString) ? "{}" : orderString;

            var queryDoc = BsonSerializer.Deserialize<BsonDocument>(_qs);
            var orderDoc = BsonSerializer.Deserialize<BsonDocument>(_ob);

            var query = new QueryDocument(queryDoc);
            var order = new SortByWrapper(orderDoc);
            MongoCursor<T> cursor = null;

            //if (_qs.Equals("{}"))
            //    cursor = collection.FindAllAs<T>();
            //else
                cursor = collection.FindAs<T>(query);

            if (fields.Count > 0)
                cursor.SetFields(fields.ToArray());

            //if (!_ob.Equals("{}"))
                cursor.SetSortOrder(order);

            return cursor.ToList();
        }

        public static void Extend(this JArray d, dynamic obj)
        {
            d.Add(JsonConvert.DeserializeObject<dynamic>(JsonConvert.SerializeObject(obj)));
        }
    }
}