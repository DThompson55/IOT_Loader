// An IOT event loader. Reads CSV files. Sends each row to WIOT
// assumes CSV is in order by timestamp 
// assumes your IOT event definition matches the headers of the CVS file
//
// Add your Watson IOT key and token to bash shell
// export WIOTP_API_KEY='a-04tdsgxxxxxxxxxxx'
// export WIOTP_API_TOKEN='MK(Mxxxxxxxxxxx'
//
// from commandline: (installs dependencies)
//  npm install
// then
//  npm start -- [arguments]
// or 
//  node iot3.js [arguments]
//
// Longer example from commandline
// node iot3.js -d DTT001 -t DannyDeviceType -f 'test/MockData.csv' 
// -e EV01 -T "" --ignoreColumn ROWID --newBase "1/19/22 1:05" --oldBase "1/19/22 1:05" --dryRun=false
// -auth_check
//
const fs = require('fs');
const csv = require('csv-parser');
const sdk = require('@wiotp/sdk');
var ApplicationClient = sdk.ApplicationClient;
var ApplicationConfig = sdk.ApplicationConfig;
let appConfig = ApplicationConfig.parseEnvVars();

var argv = require('yargs/yargs')(process.argv.slice(2))
.option('filename',{alias:'f',describe:'the filename',type:'string'})
.option('deviceId',{alias:'d',describe:'the deviceId',type:'string'})
.option('deviceType',{alias:'t',describe:'the deviceType',type:'string'})
.option('eventType',{alias:'e',describe:'the eventType',type:'string'})
.option('timestampColumn',{alias:'T',describe:'the timestampColumn name',type:'string', default:""})
.option('newBase',{alias:'n',describe:'new time base will replace old time base, fmt MM/DD/YY HH:MM',type:'string'})
.option('oldBase',{alias:'o',describe:'both new and old must be specified to work',type:'string', default:"5/28/21 1:05"})
.option('ignoreColumn',{describe:'csv column name to ignore',type:'string',default:'ROWID'})
.option('dryRun',{describe:'do not send to Watson IOT',type:'boolean',default:false})
.option('verbose',{alias:'v',describe:'console log on',type:'boolean',default:false})
.option('auth_check',{alias:'x',describe:'test creds are OK?',type:'boolean',default:false})
.usage('Usage: $0 -f <csv file> -d <deviceType> -t <deviceId> -e <eventType>'+ 
       '\nsee options to alter timestamps, validate auth, dryrun, etc.'+
       '\n requires WIOPT API Key and Token as env vbls'+
       '\n export WIOTP_API_KEY="a-04tdsg-pohxaxxxxx"'+
       '\n export WIOTP_API_TOKEN="MK(MelUtwX0uxxxxx"')
//.demandOption(['f','d','t','e'])
.check((argv) => {
    if (!(argv.x || (argv.f && argv.d && argv.t && argv.e))) {
      throw new Error('Requires cmdline arguments [f d t e] or [x]');
    } else {
      return true;
    }})
.argv;


var filename = argv.filename
var deviceType = argv.deviceType;
var deviceId = argv.deviceId;
var eventType = argv.eventType;
var ignoreColumn = argv.ignoreColumn;
var timestampColumn = argv.timestampColumn;
var newBase = argv.newBase;
var oldBase = argv.oldBase;
var adjustTimeStamps = (typeof oldBase !== 'undefined' && oldBase) && 
                       (typeof newBase !== 'undefined' && newBase);
var dryRun = argv.dryRun;
var verbose = argv.verbose;
var auth_check = argv.x;

if ( auth_check ){

  if (!appConfig.auth){
   console.log("auth check failed: set your Watson IOT key and token in ~/.bash_profile or ~/.zprofile on mac:")
   console.log('"export WIOTP_API_KEY="a-04tdsg-pohxaxxxxx"')
   console.log('"export WIOTP_API_TOKEN="MK(MelUtwX0uxxxxx"')
   process.exit();
 }
  let appClient = new ApplicationClient(appConfig);
  appClient.connect();
  appClient.on("connect", function () {
    console.log("Authentication is configured properly");
    process.exit();
  })
} else {

  if (!adjustTimeStamps){
    console.log("info: timestamps will not be adjusted","--oldBase=",oldBase,"--newBase",newBase)
  }
  if (verbose && dryRun ) console.log("Dry run - no data will be sent to Watson IOT")
  //----------------
  var ztime = new Date(0);
  if (newBase) {newBase = new Date(newBase);} else {newBase = new Date();}
  if (oldBase) oldBase = new Date(oldBase); else oldBase = new Date();
  ztime = ((new Date(newBase.getTime()-(oldBase.getTime())).getTime()))

  if (verbose) console.log("OldBase is ",oldBase,"input as",argv.oldBase)
  if (verbose) console.log("NewBase is ",newBase,"input as",argv.newBase)
  if (verbose) console.log("Diff    is ",new Date(ztime))


  function formatDate(d) {
    if (d) {return ""+(d.getMonth()+1)+"/"+
      String(d.getDate()).padStart(2,'0')+"/"+
      (d.getYear()+1900)+" "+d.getHours()+":"+
      String(d.getMinutes()).padStart(2,'0') }else{ return "NaD"}}

  function fixTimeStamp(d){
    if (!d) throw new Error("missing time stamp");
    if (adjustTimeStamps)
      return formatDate(new Date(new Date(d).getTime() + ztime));
    else
      return d;
  }


  let appClient = new ApplicationClient(appConfig);
  appClient.connect();
  appClient.on("connect", function () {

  fs.createReadStream(filename)
    .pipe(csv())
    .on('data', (row) => {
      try {
      if (timestampColumn == '') {// give the timestamp column a name if it doesn't have one
        row.timestamp = fixTimeStamp((row[timestampColumn]));
        delete row[timestampColumn];
      }
      else
        (row[timestampColumn]) = fixTimeStamp((row[timestampColumn]));
    } catch (exp){
      console.error(exp)
      console.error("Row"+row);
      throw new Error("Bad CSV Row")
    }
    if (ignoreColumn)
        delete row[ignoreColumn];
    if (verbose) console.log(row);
    if (!dryRun) appClient.publishEvent(deviceType, deviceId, eventType, "json", row);

    })
    .on('end', () => {
      console.log('CSV file successfully processed');
      process.process.exit()()  
    });
  })
}