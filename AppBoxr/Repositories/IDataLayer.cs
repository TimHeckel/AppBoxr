using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace AppBoxr
{
    public interface IDataLayer
    {
        IEnumerable<dynamic> Get(dynamic lookup);
        IEnumerable<string> Save(dynamic model);
        bool Delete(dynamic lookup);
    }
}
