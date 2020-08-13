import { Service, PlatformAccessory } from 'homebridge';

import { OndusPlatform } from './ondusPlatform';
import { OndusAppliance } from './ondusAppliance';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class OndusSenseGuard extends OndusAppliance {
  static ONDUS_TYPE = 103;
  static ONDUS_NAME = 'Sense Guard';

  public tempService: Service;

  /**
   * Ondus Sense Guard constructor for mains powered water control valve
   */
  constructor(
    public ondusPlatform: OndusPlatform,
    public accessory: PlatformAccessory,
    public locationID: number,
    public roomID: number,
  ) {
    super(ondusPlatform, accessory, locationID, roomID);

    // set accessory information
    this.accessory.getService(this.ondusPlatform.Service.AccessoryInformation)!
      .setCharacteristic(this.ondusPlatform.Characteristic.Manufacturer, OndusSenseGuard.ONDUS_PROD)
      .setCharacteristic(this.ondusPlatform.Characteristic.Model, OndusSenseGuard.ONDUS_NAME)
      .setCharacteristic(this.ondusPlatform.Characteristic.HardwareRevision, accessory.context.device.type)
      .setCharacteristic(this.ondusPlatform.Characteristic.SerialNumber, accessory.context.device.serial_number)
      .setCharacteristic(this.ondusPlatform.Characteristic.FirmwareRevision, accessory.context.device.version)
      .setCharacteristic(this.ondusPlatform.Characteristic.FirmwareRevision, accessory.context.device.version);

    // get the Temperature service if it exists, otherwise create a new Temperature service
    // you can create multiple services for each accessory
    this.tempService = this.accessory.getService(this.ondusPlatform.Service.TemperatureSensor) || 
        this.accessory.addService(this.ondusPlatform.Service.TemperatureSensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.tempService.setCharacteristic(this.ondusPlatform.Characteristic.Name, accessory.context.device.name);

    // Fetch updated values from Ondus API on startup
    
    /*
    this.updateTemperature();

    // Start timer for fetching updated values from Ondus API once every refresh_interval from now on
    let refreshInterval = this.ondusPlatform.config['refresh_interval'] * 10000;
    if (!refreshInterval) {
      this.ondusPlatform.log.warn('Refresh interval incorrectly configured in config.json - using default value of 3600000');
      refreshInterval = 3600000;
    }
    setInterval( () => {
      this.accessory.reachable = true; // Reset state to reachable before fetching new data
      this.updateTemperature();
    }, refreshInterval);
    */
  }

  /**
   * Handle requests to get the current value of the "Current Relative Humidity" characteristic
   */
  updateTemperature() {
    this.ondusPlatform.log.debug('Updating temperature');

    // Fetch appliance measurements using current timestamp
    // If no measurements are present, the following is returned {"code":404,"message":"Not found"}

    // Use last update timestamp from service for querying latest measurements
    const todayDate = new Date(Date.now());
    const fromDate = new Date(this.accessory.context.device.tdt);
    const diffSeconds = todayDate.getSeconds() - fromDate.getSeconds();
    let warning = '';
    if (diffSeconds > 86400) {
      const days = Math.round(diffSeconds / 86400);
      warning = `Retrieved data is ${days} day(s) old!`;
      this.ondusPlatform.log.warn(warning);
      this.accessory.reachable = false;
    }
    // Get fromDate measurements
    this.getApplianceMeasurements(fromDate)
      .then( measurement => {
        const measurementArray = measurement.body.data.measurement;
        if (!Array.isArray(measurementArray)) {
          this.ondusPlatform.log.debug('Unknown response:', measurementArray);
          this.accessory.reachable = false;
        }
        this.ondusPlatform.log.debug(`Retrieved ${measurementArray.length}: measurements - picking last one`);
        measurementArray.sort((a, b) => {
          const a_ts = new Date(a.timestamp).getSeconds();
          const b_ts = new Date(b.timestamp).getSeconds();
          if(a_ts > b_ts) {
            return 1;
          } else if(a_ts < b_ts) {
            return -1;
          } else {
            return 0;
          }
        });
        const temperature = measurementArray.slice(-1)[0].temperature;
        this.ondusPlatform.log.debug(`Last measured temperature level: ${temperature}`);

        // Update temperature and humidity values
        this.tempService.setCharacteristic(this.ondusPlatform.Characteristic.CurrentTemperature, temperature);
      })
      .catch( err => {
        this.ondusPlatform.log.error('Unable to update temperature: ', err);
        this.accessory.reachable = false;
      });
  }

}
