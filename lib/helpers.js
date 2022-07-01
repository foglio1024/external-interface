class Helpers
{
    static buildHeaders(length)
    {
        return {
            'Content-Type': 'application/json',
            'Content-Length': length,
            'User-Agent': 'externalinterface',
            'Connection': 'Keep-Alive',
            'Keep-Alive': 'timeout=1, max=100'
        };
    }
    static buildResponse(ret, id, type)
    {
        return {
            'jsonrpc': '2.0',
            [type]: ret,
            'id': id
        };
    }
    static buildOpcodesMap(dispatch, params){
        let map = new Map();
        let content = "";
        switch (params.mapType)
        {
            case 'protocol':
                map = dispatch.protocolMap.name;
                break;
            case 'sysmsg':
                map = dispatch.sysmsgMap.name;
                break;
        }
        for (const [k, v] of map)
        {
            content += `${k} ${v}\n`
        }

        return content;
    }

}
exports.Helpers = Helpers;
