const fs = require('fs');
const process = require('process');
const { Helpers } = require('./helpers');

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

    getLanguage()
    {
        const networkMod = this.getCurrentNetworkMod();
        return networkMod === undefined
        ? ""
        : this.toolboxLanguageToRegion(networkMod.language);
    }

    toolboxLanguageToRegion(language) {
        switch (language.toUpperCase()) {
            case 'EUR':
            case 'FRA':
            case 'GER':
                return 'EU';
            case 'RUS':
                return 'RU';
            case 'KOR':
                return 'KR';
            case 'JPN':
                return 'JP';
            case 'TW':
                return 'TW';
            default:
                throw new Error(`Invalid language "${language}"!`);
        }
    }

    // Returns current server info:
    /*
    {
        "id" : 1234,
        "category" : "PvP",
        "name" : "Server Name",
        "address" : "1.2.3.4",
        "port" : 1025,
        "region" : "EU" --- added later
    }
    */
    getServerInfo()
    {
        const networkMod = this.getCurrentNetworkMod();
        return networkMod === undefined
        ? null
        : networkMod.serverList[networkMod.serverId];
    }

    // compatbility with meter, remove
    getServer(){
        return this.getServerId();
    }

    // Returns current server id
    getServerId()
    {
        const server = this.getServerInfo();
        return server === null 
        ? 0
        : server.id;
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
    dumpMapSync(params)
    {
        let ret = true;
        let content = Helpers.buildOpcodesMap(this.getCurrentNetworkMod().dispatch, params);
        fs.writeFileSync(params.path, content, function (err, data)
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
