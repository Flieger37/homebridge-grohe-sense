import { PlatformAccessory } from 'homebridge';

import { OndusPlatform } from './ondusPlatform';



/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export abstract class OndusAppliance {
  static ONDUS_TYPE = 0;
  static ONDUS_PROD = 'Grohe AG'
  static ONDUS_NAME = 'Overload me';

  logPrefix: string;
  applianceID: string;

  /**
   * Ondus Sense virtual class
   */
  constructor(
    public ondusPlatform: OndusPlatform,
    public locationID: number,
    public roomID: number,
    public accessory: PlatformAccessory,
  ) {
    this.logPrefix = accessory.context.device.name;
    this.applianceID = accessory.context.device.appliance_id;
  }

  public getLocationID() {
    return this.locationID;
  }

  public getRoomID() {
    return this.roomID;
  }

  public getApplianceID() {
    return this.applianceID;
  }

  /**
   * Utility functions
   */
  public unhexlify(str: string) {
    let result = '';
    for (let i=0, l=str.length; i<l; i+=2) {
      result += String.fromCharCode(parseInt(str.substr(i, 2), 16));
    }
    return result;
  }

  /**
   * Retrieve appliance info like appliance ID, type, and name as a JSON object 
   */
  public async getApplianceInfo() {
    return this.ondusPlatform.ondusSession.getApplianceInfo(
      this.getLocationID(),
      this.getRoomID(), 
      this.getApplianceID());
  }

  /**
   * Make sure accessory context device is updated with the latest appliance info,
   * else the last available data will not be fetched 
   */
  async updateApplianceInfo() {
    this.ondusPlatform.log.debug(`[${this.logPrefix}] Updating appliance info`);
    this.getApplianceInfo()
      .then( info => {
        //this.ondusPlatform.log.debug('info: ', info.body);
        this.accessory.context.device = info.body[0];
      })
      .catch( err => {
        this.ondusPlatform.log.error(`[${this.logPrefix}] Unable to update appliance info: ${err.text}`);
      });
  }

  /**
   * Retrieve appliance notifications as a JSON object.
   * 
   * Will only return data if messages are marked as unread on the web service
   */
  public async getApplianceNotifications() {
    return this.ondusPlatform.ondusSession.getApplianceNotifications(
      this.getLocationID(), 
      this.getRoomID(), 
      this.getApplianceID());
  }

  /**
   * Retrieve appliance measurements as a JSON object
   * 
   * @param fromDate Optional Date argument when to fetch measurements from
   */
  public async getApplianceMeasurements(fromDate?: Date) {
    return this.ondusPlatform.ondusSession.getApplianceMeasurements(
      this.getLocationID(), 
      this.getRoomID(), 
      this.getApplianceID(), 
      fromDate);
  }

  /**
   * Retrieve appliance status like wifi quality, battery, 
   * and connection status as a JSON object
   */
  public async getApplianceStatus() {
    return this.ondusPlatform.ondusSession.getApplianceStatus(
      this.getLocationID(), 
      this.getRoomID(), 
      this.getApplianceID());
  }

  /**
   * Retrieve appliance command
   */
  public async getApplianceCommand() {
    return this.ondusPlatform.ondusSession.getApplianceCommand(
      this.getLocationID(),
      this.getRoomID(),
      this.getApplianceID());
  }

  /**
   * Send new appliance command 
   * 
   * @param data JSON object containing new appliance configuration 
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  public async setApplianceCommand(data) {
    return this.ondusPlatform.ondusSession.setApplianceCommand(
      this.getLocationID(),
      this.getRoomID(),
      this.getApplianceID(),
      data,
    );
  }

}