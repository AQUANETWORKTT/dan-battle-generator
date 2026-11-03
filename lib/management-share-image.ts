// Keep the Management portal's branding separate from the Events/Atlas sites.
export const isManagementSite = !['events','atlas'].includes(process.env.SITE_MODE || '');
export const managementShareImages = isManagementSite ? {images:[{
  url:'https://firstclassagency.management/branding/first-class-management-share.png',
  width:661,height:661,alt:'First Class Agency',
}]} : {};
