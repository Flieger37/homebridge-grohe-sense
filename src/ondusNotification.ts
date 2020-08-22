import { OndusAppliance } from './ondusAppliance';
import { OndusThresholds } from './ondusThresholds';

export const NOTIFICATION_CATEGORY_FIRMWARE = 10;
export const NOTIFICATION_CATEGORY_WARNING = 20;
export const NOTIFICATION_CATEGORY_CRITICAL = 30;

export class OndusNotification {

  thresholds: OndusThresholds;

  private NOTIFICATION_MAP;

  /**
    * Ondus Notification handler class
    */
  constructor(
      private category: number,
      private type: number,
      private timestamp: string,
      private appliance: OndusAppliance,
  ) {
    this.category = category;
    this.type = type;
    this.timestamp = timestamp;
    this.appliance = appliance;
    this.thresholds = appliance.thresholds;

    // The Ondus API returns notification information as a {category: type}
    this.NOTIFICATION_MAP = {
      'category' : {
        10 : {
          'type'  : {
            60  : 'Firmware update available',
            460 : 'Firmware update available',
          },  
        },
        NOTIFICATION_CATEGORY_WARNING : {
          'type' : {
            11  : `Battery is at critical level: ${this.appliance['currentBatteryLevel']}%`,
            12  : 'Battery is empty and must be changed',
            20  : `Temperature levels have dropped below the minimum configured limit of ${this.thresholds.getLowTempLimit()}˚C`,
            21  : `Temperature levels have exceeded the maximum configured limit of ${this.thresholds.getHighTempLimit()}˚C`,
            30  : `Humidity levels have dropped below the minimum configured limit of ${this.thresholds.getLowHumidLimit()}% RF`,
            31  : `Humidity levels have exceeded the maximum configured limit of ${this.thresholds.getHighHumidLimit()}% RF`,
            40  : `Frost warning! Current temperature is ${this.appliance.currentTemperature}˚C`,
            80  : 'Lost WiFi',
            320 : 'Unusual water consumption detected - water has been SHUT OFF',
            321 : 'Unusual water consumption detected - water still ON',
            330 : 'Micro leakage detected',
            340 : `Frost warning! Current temperature is ${this.appliance.currentTemperature}˚C`,
            380 : 'Lost WiFi',
          },
        },
        /* CATEGORY 30 is the most severe, and notifications in this category will always trigger leakServices */
        30 : {
          'type' : {
            0   : 'Flooding detected - water has been SHUT OFF',
            310 : 'Pipe break - water has been SHUT OFF',
            400 : 'Maximum water volume reached - water has been SHUT OFF',
            430 : 'Water detected - water has been SHUT OFF',
            431 : 'Water detected - water still ON',
          },
        },
      },
    };


  }

  getNotification() {
    const notification = this.NOTIFICATION_MAP.category[this.category].type[this.type];
    const message = `${this.timestamp} => ${notification}`;
    return message;

  }
}


