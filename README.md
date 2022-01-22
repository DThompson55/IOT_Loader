# Watson IOT Data Loader Utility

## Usage
### install dependencies
```
npm install
```
### set your Watson IOT Key and Token in memory
In your ~./bash_profile or on MacOs ~./zprofile
```
export WIOTP_API_KEY='a-04tdsg-xxxxxxxxxx'
export WIOTP_API_TOKEN='MK(Mexxxxxxxxxx'
```

### test your auth token
npm requires double dashs after the word start.
```
npm start -- -x
```

### do a dry run or not
```
npm start -- --deviceId DTT001   // which deviceID to send to
  --deviceType DannyDeviceType   // what is its device type
  --filename 'test/MockData.csv' // the CSV file to send 
  --eventType EV01               // the event type matching the csv
  --timestampColumn ""           // the name of the timestamp column
  --newBase "1/19/22 1:05"       // date math on timestamp column
  --oldBase "1/19/22 1:05"       // date math on timestamp column
  --ignoreColumn ROWID           // you can delete a colum if you like
  --dryrun                       // optionally do not send to IOT
```
## About Date Manipulation
Most test suites all have their dates preset in the past. But what if you want to make them appear current? Date Math! If you have both the NewBase and OldBase args set, we'll do the math to apply the difference to the entire file. Magic.

For example if your test set starts on 1/1/2019 through 12/31/2019 and you want to have it start on today's date you'd use -n <today's date> -o 1/1/2019. If you wanted it to start on 1/1/202 you'd use -n 1/1/2020 -o 1/1/2019. If you wanted it to end on today's date you'd use -n <today's date> -o 12/31/2019, etc.

Date formats are currently hard coded to MM/DD/YY HH:DD with leading zeros truncated. A future enhancement idea would be to pass in a date format.

## Abends
Throws exceptions if the timestamp field is empty, and prints the current row.  
