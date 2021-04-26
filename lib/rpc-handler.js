const fs = require('fs');
const process = require('process');

class RpcHandler
{
    constructor(mod)
    {
        this.mod = mod;
        this._networkMod = null;
    }

    getCurrentNetworkMod()
    {
        const count = this.mod.parent.networkInstances.size;
        if (count === 0) 
        {
            this._networkMod = null;
            return undefined;
        }
        if(this._networkMod !== null) return this._networkMod;
        this._networkMod = this.mod.parent.networkInstances.values().next().value.instance.mod;
        return this._networkMod;        
    }

    handle(request)
    {
        return this[request.method](request.params);
    }

    // Returns current server id
    getServer()
    {
        if(this.getCurrentNetworkMod() === undefined) 
        {
            return 0;
        }
        let ret = this.getCurrentNetworkMod().serverId;
        return ret;
    }

    // Returns client ProtocolVersion
    getProtocolVersion()
    {
        return this.getCurrentNetworkMod().protocolVersion;
    }
    
    // Returns client ReleaseVersion
    getReleaseVersion()
    {
        return (this.getCurrentNetworkMod().majorPatchVersion * 100) + this.getCurrentNetworkMod().minorPatchVersion;
    }

    // Dumps opcodes or sysmsg to the specified file in the "NAME CODE" format
    // params.path    : "full/path/to/file",
    // params.mapType : "protocol" | "sysmsg"
    dumpMap(params)
    {
        let map = new Map();
        let ret = true;
        let content = "";
        switch (params.mapType)
        {
            case 'protocol':
                map = this.getCurrentNetworkMod().dispatch.protocolMap.name;
                break;
            case 'sysmsg':
                map = this.getCurrentNetworkMod().dispatch.sysmsgMap.name;
                break;
        }
        for (const [k, v] of map)
        {
            content += `${k} ${v}\n`
        }
        fs.writeFile(params.path, content, function (err, data)
        {
            if (err)
            {
                ret = false;
            }
        });
        return ret;
    }

    addHooks(params)
    {
        params.hooks.forEach(opc =>
        {
            this.getCurrentNetworkMod().command.exec(`ext add ${opc}`);
        });
    }

    removeHooks(params)
    {
        params.hooks.forEach(opc =>
        {
            this.getCurrentNetworkMod().command.exec(`ext rem ${opc}`);
        });
    }

    addDefinition(params)
    {
        const def = [];
        let fields = params.def.split('\n');
        fields.forEach(f =>
        {
            def.push(f.split(' '));
        });
        this.getCurrentNetworkMod().dispatch.addDefinition(params.opcodeName, params.version, def);
    }

    addOpcode(params)
    {
        this.getCurrentNetworkMod().dispatch.addOpcode(params.opcodeName, params.opcode);
    }

    getToolboxPID()
    {
        return process.pid;
    }
}
exports.RpcHandler = RpcHandler;
