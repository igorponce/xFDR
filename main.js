const xplane = require('./xplane/xplane.js');
const fs = require('fs');

main();

function main(){

    var server = xplane.socket();
    let approachesHistory = require('./approaches_history.json');
    var airportInfo = {
        ICAO: 'SBSP',
        elevation: 2631,
        IF:{'name': 'GERSU', 'lat':-23.511388889, 'lng':-46.736138889},
        stabilizationAltitude: function(){return this.elevation + 1000;}
    }

    var alreadyCapturedIF = false;
    var cycle = {};
    
    server.on('message', function (message, remote) {
        xplane_data = xplane.getRefs(message);
        var aircraft = {
            altitude_msl: xplane_data["globalposition"]["values"]['altmsl'],
            v_speed: xplane_data["clbstats"]["values"]['v-spd'],
            lat: xplane_data["globalposition"]["values"]['lat'],
            lng: xplane_data["globalposition"]["values"]['lon'],
            gs: xplane_data["airspeed"]["values"]['truegnd'],
            ias: xplane_data["airspeed"]["values"]['indicated'],
            pitch: xplane_data["attitude"]["values"]['pitch'],
            bank: xplane_data["attitude"]["values"]['roll'],
            gw: xplane_data["payload"]["values"]['curnt']*0.453592,
            gear: xplane_data["gear"]["values"]['gear'],
            speedbrake: xplane_data["surfaces"]["values"]['sb_postn'],
            flaps: xplane_data["surfaces"]["values"]['f_postn'],
        }

        if(IsInsideRange(aircraft,airportInfo.IF,1.3)){
            if(!alreadyCapturedIF) captureAircraftInfoAtIF(aircraft);
        }
        if(aircraft.altitude_msl <= airportInfo.stabilizationAltitude() && alreadyCapturedIF){
            captureAircraftInfoAt1000AGL(aircraft);
        }

    });
    
    function captureAircraftInfoAtIF(aircraft){
        console.log('Passando ' + airportInfo.IF.name);
        cycle = aircraft;
        alreadyCapturedIF = true;
        isOnFinal = true;
    }
    function captureAircraftInfoAt1000AGL(aircraft){
        alreadyCapturedIF = false;
        cycle.atOneThousandAFE = aircraft;
        cycle.stabilized = IsAircraftStabilized(aircraft);
        approachesHistory.push(cycle);
        fs.writeFileSync('approaches_history.json', JSON.stringify(approachesHistory));
        cycle = {};
        console.log('1000ft, estabilizado: ' + IsAircraftStabilized(aircraft));
    }
}

function IsAircraftStabilized(aircraft){
    if(aircraft.ias >= 152){
        console.log('desestabilizou por IAS');
        return false;
    }
    if(aircraft.v_speed <= -1000){
        console.log('desestabilizou por VS');
        return false;
    }
    if(aircraft.flaps < 0.75){
        console.log('desestabilizou por FLAP');
        return false;
    }
    if(aircraft.speedbrake > 0.01 && aircraft.speedbrake <= 1){
        console.log('desestabilizou por SPEEDBRAKE');
        return false;
    }
    if(aircraft.gear == 0){
        console.log('desestabilizou por GEAR');
        return false;
    }
    return true;
}

function IsInsideRange(checkPoint, centerPoint, km) {
    var ky = 40000 / 360;
    var kx = Math.cos(Math.PI * centerPoint.lat / 180.0) * ky;
    var dx = Math.abs(centerPoint.lng - checkPoint.lng) * kx;
    var dy = Math.abs(centerPoint.lat - checkPoint.lat) * ky;
    return Math.sqrt(dx * dx + dy * dy) <= km;
}

