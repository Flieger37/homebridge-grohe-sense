import { PlatformAccessory, Service } from 'homebridge';

import { OndusAppliance } from './ondusAppliance';
import { OndusPlatform, NOTIFICATION_TYPES } from './ondusPlatform';


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class OndusSense extends OndusAppliance {
  static ONDUS_TYPE = 101;
  static ONDUS_NAME = 'Sense';

  leakService: Service;
  humidityService: Service;
  temperatureService: Service;
  batteryService?: Service;

  
  private currentTemperature: number;
  private currentHumidity: number;
  private currentBatteryLevel: number;
  private currentWiFiQuality: number;
  private currentConnection: number;
  private currentTimestamp: string;
  private leakDetected: boolean;
  /**
   * Ondus Sense constructor for battery powered water leakage detectors
   */
  constructor(
    public ondusPlatform: OndusPlatform,
    public locationID: number,
    public roomID: number,
    public accessory: PlatformAccessory,
  ) {
    // Call parent constructor
    super(ondusPlatform, locationID, roomID, accessory);

    // Placeholders for sensor data
    this.currentTemperature = 0;
    this.currentHumidity = 0;
    this.currentBatteryLevel = 0;
    this.currentWiFiQuality = 0;
    this.currentConnection = 0;
    this.currentTimestamp = '';
    this.leakDetected = false;

    // set accessory information
    this.accessory.getService(this.ondusPlatform.Service.AccessoryInformation)!
      .setCharacteristic(this.ondusPlatform.Characteristic.Manufacturer, OndusSense.ONDUS_PROD)
      .setCharacteristic(this.ondusPlatform.Characteristic.Model, OndusSense.ONDUS_NAME)
      .setCharacteristic(this.ondusPlatform.Characteristic.Name, accessory.context.device.name)
      .setCharacteristic(this.ondusPlatform.Characteristic.HardwareRevision, accessory.context.device.type)
      .setCharacteristic(this.ondusPlatform.Characteristic.SerialNumber, this.unhexlify(accessory.context.device.serial_number))
      .setCharacteristic(this.ondusPlatform.Characteristic.FirmwareRevision, accessory.context.device.version)
      .setCharacteristic(this.ondusPlatform.Characteristic.AppMatchingIdentifier, '1451814256');

    // Initialize services

    /**
     * Leakage service
     */
    this.leakService = this.accessory.getService(this.ondusPlatform.Service.LeakSensor) ||
      this.accessory.addService(this.ondusPlatform.Service.LeakSensor);

    // set the Leak service characteristics
    this.leakService
      .setCharacteristic(this.ondusPlatform.Characteristic.Name, accessory.context.device.name)
      .setCharacteristic(this.ondusPlatform.Characteristic.LeakDetected, this.ondusPlatform.Characteristic.LeakDetected.LEAK_NOT_DETECTED)
      .setCharacteristic(this.ondusPlatform.Characteristic.StatusFault, this.ondusPlatform.Characteristic.StatusFault.NO_FAULT);

    // create handlers for required characteristics of Leak service
    this.leakService.getCharacteristic(this.ondusPlatform.Characteristic.LeakDetected)
      .on('get', this.handleLeakDetectedGet.bind(this));


    /**
     * Temperature Service
     */

    // get the Temperature service if it exists, otherwise create a new Temperature service
    this.temperatureService = this.accessory.getService(this.ondusPlatform.Service.TemperatureSensor) || 
       this.accessory.addService(this.ondusPlatform.Service.TemperatureSensor);

    // set the Temperature service characteristics
    this.temperatureService
      .setCharacteristic(this.ondusPlatform.Characteristic.Name, accessory.context.device.name)
      .setCharacteristic(this.ondusPlatform.Characteristic.StatusFault, this.ondusPlatform.Characteristic.StatusFault.NO_FAULT);

    // create handlers for required characteristics of Temperature service
    this.temperatureService.getCharacteristic(this.ondusPlatform.Characteristic.CurrentTemperature)
      .on('get', this.handleCurrentTemperatureGet.bind(this));


    /**
     * Humidity Service
     */

    // get the Humidity service if it exists, otherwise create a new Humidity service
    this.humidityService = this.accessory.getService(this.ondusPlatform.Service.HumiditySensor) || 
       this.accessory.addService(this.ondusPlatform.Service.HumiditySensor);

    // set the Humidity service characteristics
    this.humidityService
      .setCharacteristic(this.ondusPlatform.Characteristic.Name, accessory.context.device.name)
      .setCharacteristic(this.ondusPlatform.Characteristic.StatusFault, this.ondusPlatform.Characteristic.StatusFault.NO_FAULT);

    // create handlers for required characteristics for Humidity service
    this.humidityService.getCharacteristic(this.ondusPlatform.Characteristic.CurrentRelativeHumidity)
      .on('get', this.handleCurrentRelativeHumidityGet.bind(this));
   

    /**
     * Battery Service
     * 
     * This service will only be created for Sense type sensors, 
     * and not Sense Plus which is mains powered
     */

    // 
    if (this instanceof OndusSense) {
      
      // create handlers for battery characteristics for Temperature and Humidity service
      this.batteryService = this.accessory.getService(this.ondusPlatform.Service.BatteryService) || 
       this.accessory.addService(this.ondusPlatform.Service.BatteryService);
    
      // set the Battery service characteristics
      this.batteryService
        .setCharacteristic(this.ondusPlatform.Characteristic.Name, accessory.context.device.name)
        .setCharacteristic(this.ondusPlatform.Characteristic.ChargingState, this.ondusPlatform.Characteristic.ChargingState.NOT_CHARGEABLE)
        .setCharacteristic(this.ondusPlatform.Characteristic.StatusFault, this.ondusPlatform.Characteristic.StatusFault.NO_FAULT);

      // create handlers for required characteristics of Battery service
      this.batteryService.getCharacteristic(this.ondusPlatform.Characteristic.BatteryLevel)
        .on('get', this.handleBatteryLevelGet.bind(this));
      this.batteryService.getCharacteristic(this.ondusPlatform.Characteristic.StatusLowBattery)
        .on('get', this.handleStatusLowBatteryGet.bind(this));

      
      // NOTE:
      // It is possible to not add a separate battery service, but instead add these characteristics
      // to the temperature and humidity service directly. But according to interface defined on 
      // https://developers.homebridge.io these characteristics are not supported for those service types.
      /*
      this.temperatureService.getCharacteristic(this.ondusPlatform.Characteristic.BatteryLevel)
        .on('get', this.handleBatteryLevelGet.bind(this));
      this.temperatureService.getCharacteristic(this.ondusPlatform.Characteristic.StatusLowBattery)
        .on('get', this.handleStatusLowBatteryGet.bind(this));
      this.humidityService.getCharacteristic(this.ondusPlatform.Characteristic.BatteryLevel)
        .on('get', this.handleBatteryLevelGet.bind(this));
      this.humidityService.getCharacteristic(this.ondusPlatform.Characteristic.StatusLowBattery)
        .on('get', this.handleStatusLowBatteryGet.bind(this));
      */
    }



    // Fetch initial sensor data from Ondus API on startup
    this.getMeasurements();
    this.getStatus();
    
    // Start timer for fetching updated values from Ondus API once every refresh_interval from now on
    // The reason is that sensors only report new data once every day, so no point in querying Ondus API often
    let refreshInterval = this.ondusPlatform.config['refresh_interval'] * 1000;
    if (!refreshInterval) {
      // eslint-disable-next-line max-len
      this.ondusPlatform.log.warn(`[${this.logPrefix}] Refresh interval incorrectly configured in config.json - using default value of 3600 seconds`);
      refreshInterval = 3600000;
    }
    setInterval( () => { 
      // Make sure accessory context device has the latest appliance info
      this.updateApplianceInfo(); 
      // Fetch new data
      this.getMeasurements();
      this.getStatus();
    }, refreshInterval);
  }

  
  /**
   * Handle requests to get the current value of the "LeakDetected" characteristics
   * 
   * This is the only handler for this class that must fetch and process appliance notifications 
   * directly from the Ondus API upon request, because the Sense can potentially report a new 
   * notification if a configured threshold has been exceeded within the last hours.
   */
  handleLeakDetectedGet(callback) {
    this.ondusPlatform.log.debug(`[${this.logPrefix}] Triggered GET LeakDetected:`);

    // Fetch buffered notifications from the Ondus API
    this.getApplianceNotifications()
      .then( res => {
        this.ondusPlatform.log.debug(`[${this.logPrefix}] Processing ${res.body.length} notifications ...`);

        // Reset leakDetected before parsing notifications
        this.leakDetected = false;

        // Iterate over all notifications for this accessory
        res.body.forEach(element => {
          if (element.category === 30) {
            // Check if notifications contained one or more category 30 messages.
            // If this is the case a leakage has been detected
            this.leakDetected = true;
          }
          // Log each notification message regardless of category. These messages will be 
          // encountered and logged until they are marked as read in the Ondus mobile app
          const notification = NOTIFICATION_TYPES[`(${element.category},${element.type})`];
          this.ondusPlatform.log.warn(`[${this.logPrefix}] ${notification} reported ${element.timestamp}`);
        });

        // Update the leakService LeakDetected characteristics
        if (this.leakDetected) {
          this.leakService.updateCharacteristic(this.ondusPlatform.Characteristic.LeakDetected, 
            this.ondusPlatform.Characteristic.LeakDetected.LEAK_DETECTED);
        } else {
          this.leakService.updateCharacteristic(this.ondusPlatform.Characteristic.LeakDetected, 
            this.ondusPlatform.Characteristic.LeakDetected.LEAK_NOT_DETECTED);
        }
        // Reset StatusFault characteristics for battery service
        this.leakService.updateCharacteristic(this.ondusPlatform.Characteristic.StatusFault, 
          this.ondusPlatform.Characteristic.StatusFault.NO_FAULT);
    
        callback(null, this.leakDetected);

      })
      .catch( err => {
        this.ondusPlatform.log.error(`[${this.logPrefix}] Unable to process notifications: ${err}`);
        
        // Set StatusFault characteristics for leakage service
        this.leakService.updateCharacteristic(this.ondusPlatform.Characteristic.StatusFault, 
          this.ondusPlatform.Characteristic.StatusFault.GENERAL_FAULT);  
  
        callback(err, this.leakDetected);
      });
  }
  
  /**
   * Handle requests to get the current value of the "Current Temperature" characteristic
   */
  handleCurrentTemperatureGet(callback) {
    this.ondusPlatform.log.debug(`[${this.logPrefix}] Triggered GET CurrentTemperature`);
    callback(null, this.currentTemperature);
  }

  /**
   * Handle requests to get the current value of the "Current Relative Humidity" characteristic
   */
  handleCurrentRelativeHumidityGet(callback) {
    this.ondusPlatform.log.debug(`[${this.logPrefix}] Triggered GET CurrentRelativeHumidity`);
    callback(null, this.currentHumidity);
  }

  /**
   * Handle requests to get the current value of the "Battery Level" characteristic
   */
  handleBatteryLevelGet(callback) {
    this.ondusPlatform.log.debug(`[${this.logPrefix}] Triggered GET BatteryLevel`);
    callback(null, this.currentBatteryLevel);
  }

  /**
   * Handle requests to get the current value of the "Status Low Battery" characteristic
   */
  handleStatusLowBatteryGet(callback) {
    this.ondusPlatform.log.debug(`[${this.logPrefix}] Triggered GET StatusLowBattery`);
    callback(null, this.currentBatteryLevel > 10 ? this.ondusPlatform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL : 
      this.ondusPlatform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
  }



  /**
   * Fetch Ondus Sense measurement data from the Ondus API
   */
  getMeasurements() {
    this.ondusPlatform.log.debug(`[${this.logPrefix}] Updating temperature and humidity levels`);

    // Fetch appliance measurements using current timestamp
    // If no measurements are present, the following is returned {"code":404,"message":"Not found"}

    // Use last update timestamp from service for querying latest measurements
    const todayDate = new Date(Date.now());
    const fromDate = new Date(this.accessory.context.device.tdt);
    const diffMsec = todayDate.getTime() - fromDate.getTime();
    let warning = '';
    if (diffMsec > 86400000) {
      const days = Math.round(diffMsec / 86400000);
      warning = `[${this.logPrefix}] Retrieved data is ${days} day(s) old!`;
      this.ondusPlatform.log.warn(warning);
    }
    // Get fromDate measurements
    this.getApplianceMeasurements(fromDate)
      .then( measurement => {
        const measurementArray = measurement.body.data.measurement;
        if (!Array.isArray(measurementArray)) {
          throw Error(`Unknown response: ${measurementArray}`);
        }
        this.ondusPlatform.log.debug(`[${this.logPrefix}] Retrieved ${measurementArray.length}: measurements - picking latest one`);
        measurementArray.sort((a, b) => {
          const a_ts = new Date(a.timestamp).getTime();
          const b_ts = new Date(b.timestamp).getTime();
          if(a_ts > b_ts) {
            return 1;
          } else if(a_ts < b_ts) {
            return -1;
          } else {
            return 0;
          }
        });

        const lastMeasurement = measurementArray.slice(-1)[0];
        this.currentTimestamp = lastMeasurement.timestamp;
        this.currentTemperature = lastMeasurement.temperature;
        this.currentHumidity = lastMeasurement.humidity;
        this.ondusPlatform.log.info(`[${this.logPrefix}] Timestamp: ${this.currentTimestamp}`);
        this.ondusPlatform.log.info(`[${this.logPrefix}] - Temperature: ${this.currentTemperature}˚C`);
        this.ondusPlatform.log.info(`[${this.logPrefix}] - Humidity: ${this.currentHumidity}% RF`);

        // Reset StatusFault characteristics temperature and humidity service
        [this.temperatureService, this.humidityService].forEach( service => {
          service.updateCharacteristic(this.ondusPlatform.Characteristic.StatusFault, 
            this.ondusPlatform.Characteristic.StatusFault.NO_FAULT);
        });
      })
      .catch( err => {
        this.ondusPlatform.log.error(`[${this.logPrefix}] Unable to update temperature and humidity: ${err}`);

        // Set StatusFault characteristics temperature and humidity service
        [this.temperatureService, this.humidityService].forEach( service => {
          service.updateCharacteristic(this.ondusPlatform.Characteristic.StatusFault, 
            this.ondusPlatform.Characteristic.StatusFault.GENERAL_FAULT);
        });
      });
  }

  /**
   * Fetch Ondus Sense battery data from the Ondus API.
   */
  getStatus() {

    if (!(this instanceof OndusSense)) {
      // Mains powered Sense Plus does not have a battery service, 
      // so we silently return if this instance is not OndusSense    
      return;
    }

    this.ondusPlatform.log.debug(`[${this.logPrefix}] Updating battery, WiFi quality, and connection status`);

    // Retrieve appliance status for this instance
    this.getApplianceStatus()
      .then(info => {
        //this.ondusPlatform.log.debug(info.body);
        info.body.forEach(infoElement => {
          if (infoElement.type === 'battery') {
            this.currentBatteryLevel = infoElement.value;
          }
          if (infoElement.type === 'wifi_quality') {
            this.currentWiFiQuality = infoElement.value;
          }
          if (infoElement.type === 'connection') {
            this.currentConnection = infoElement.value;
          }
        });
      
        this.ondusPlatform.log.info(`[${this.logPrefix}] - Battery: ${this.currentBatteryLevel}%`);
        this.ondusPlatform.log.info(`[${this.logPrefix}] - WiFi quality: ${this.currentWiFiQuality}`);
        this.ondusPlatform.log.info(`[${this.logPrefix}] - Connection: ${this.currentConnection}`);

        // Reset StatusFault characteristics for battery service
        if (this.batteryService) {
          this.batteryService.updateCharacteristic(this.ondusPlatform.Characteristic.StatusFault, 
            this.ondusPlatform.Characteristic.StatusFault.NO_FAULT);  
        }
      })
      .catch(err => {
        this.ondusPlatform.log.error(`[${this.logPrefix}] Unable to update device status: ${err}`);
        
        // Set StatusFault characteristics for battery service
        if (this.batteryService) {
          this.batteryService.updateCharacteristic(this.ondusPlatform.Characteristic.StatusFault, 
            this.ondusPlatform.Characteristic.StatusFault.GENERAL_FAULT);  
        }
      });
  }
}
