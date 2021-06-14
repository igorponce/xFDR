
const DataTypes = require("./DataTypes.js");
const os = require('os');

var xplane ={
    states:{
        goingAround: false,
    },
    aircraft:{
        altitude_agl: 0,
        v_speed: 0
    },
    getRefs: function(message){
        var xplane_data = [];
        //Data é oq me interessa
        //Datasets é a quantidade de datarefs q estou enviando
        let header = message.slice(0, 5),
			data = message.slice(5),
            datasets = Math.floor(data.length / 36);

        for(var i = 0; i < datasets*36; i+=36 ) {
            let result = this.processType(data.slice(i,i+36));
            xplane_data[result.name] = result;
        }
        return xplane_data;
    },
    processType: function(sentence){

        let type_id = sentence[`readInt8`](0);
        if(type_id < 1) type_id = type_id*-1;

        let type = DataTypes[type_id];

        var values = {}
        if ( type ) {
            var offset = 4;
            for ( var i = 0; i < type.data.length; i++ ) {
                var datapoint = type.data[i];
            
                if ( datapoint.type !== 'pad' ) {
                    values[datapoint.name] = sentence[`readFloat${os.endianness()}`](offset);
                    offset += 4
                } else {
                    //console.log(type_id,offset,datapoint, type.data[i]);
                    //offset += datapoint.length;
                    offset += 4;
                }
            }
            return {
                name: type.name,
                values: values
            }
        } else {
            return null
        }
    },
    socket: function(host='0.0.0.0',port=49005){
        var PORT = port;
        var HOST = host;
        var dgram = require('dgram');
        var server = dgram.createSocket('udp4');
        server.bind(PORT, HOST);

        server.on('listening', function () {
            var address = server.address();
            console.log('UDP Server listening on ' + address.address + ":" + address.port);
        });
        
        return server;
    },
    get:{
        altitude_agl(){
            return this.aircraft.altitude_agl;
        }
    }
}

module.exports = xplane;