const net = require('net');
// TODO: move these to settings ------
const address = '127.0.0.60';
const port = 5301;
// -----------------------------------

const connectedClients = [];
const cachedPackets = [];
const installedHooksArray = [];
var isCaching = true;

class DataInterface
{
    installRawHook(opcode)
    {
        if (installedHooksArray.indexOf(opcode) !== -1) return;
        let options = { order: -Infinity };
        try
        {
            this.mod.hook(opcode, 'raw', options, (code, data) =>
            {
                this.send(this.build(data));
            });
            installedHooksArray.push(opcode);

        } catch (err)
        {
            //this.mod.log('Failed to install hook for ' + opcode + ' ' + err);
        }
    }
    removeRawHook(opcode)
    {
        let options = { order: -Infinity };

        this.mod.unhook(opcode, 'raw', options, (code, data) =>
        {
            this.send(this.build(data));
        });
        installedHooksArray.splice(installedHooksArray.indexOf(opcode), 1);
    }
    installHooks(mod)
    {
        let opcodes = ['C_CHECK_VERSION', 'C_LOGIN_ARBITER'];

        opcodes.forEach(o =>
        {
            if (installedHooksArray.indexOf(o) !== -1) return;
            mod.hook(o, 'raw', { order: -Infinity }, (code, data) =>
            {
                this.send(this.build(data));
            });
            installedHooksArray.push(o);
        });
    }
    printInfo()
    {
        this.mod.log('Installed hooks: ' + this.installedHooks);
    }

    
    constructor(mod)
    {
        this.mod = mod;
        isCaching = true;

        mod.command.add('ext', (cmd, arg) =>
        {
            switch (cmd)
            {
                case 'add':
                    this.installRawHook(arg);
                    break;
                case 'rem':
                    this.removeRawHook(arg);
                    break;
                case 'print':
                    this.printInfo();
                    break;
            }
        });
        this.interface = new net.Server();
        this.interface.listen(port, address);
        this.interface.on("connection", (socket) =>
        {
            connectedClients.push(socket);

            this.mod.log(socket.remoteAddress + ":" + socket.remotePort + " connected!")
            socket.on("end", () =>
            {
                this.mod.log(socket.remoteAddress + ":" + socket.remotePort + " disconnected!")
                connectedClients.splice(connectedClients.indexOf(socket), 1);
            });
            socket.on("error", (err) =>
            {
                if(err.errno === 'ECONNRESET')
                {
                    this.destroySocket(socket);
                    this.mod.error(socket.remoteAddress + ":" + socket.remotePort + " encountered an error and was disconnected!")
                    return;
                }
                this.mod.error(err.errno);
            });

            if (isCaching)
            {
                cachedPackets.forEach(p => socket.write(p));
            }
        });

        this.installHooks(mod);

        // just stop caching if the user is logging in a character
        mod.hook("C_SELECT_USER", "raw", ev =>
        {
            isCaching = false;
            cachedPackets.splice(0, cachedPackets.length);
        });
    }

    build(payload)
    {
        return Buffer.from(payload);
    }

    send(data)
    {
        if (isCaching) cachedPackets.push(data);

        connectedClients.forEach(socket =>
        {
            socket.write(data);
        });
    }

    stop()
    {
        connectedClients.forEach(socket =>
        {
            socket.destroy();
        });
        connectedClients.splice(0, connectedClients.length);
        this.interface.close();
        isCaching = true;
        cachedPackets.splice(0, cachedPackets.length);
        installedHooksArray.splice(0, installedHooksArray.length);
    }

    destroySocket(socket)
    {
        socket.destroy();
        connectedClients.splice(connectedClients.indexOf(socket), 1);
    }

    destructor()
    {
        this.stop();
    }
}

exports.DataInterface = DataInterface;
