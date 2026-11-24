// src/lib/events.js
// Names of the custom window events and localStorage "signal" keys the app uses to tell
// other screens to refresh. Values are the original strings; never change them without
// updating every dispatcher and listener.
export const EVENTS = {
  // Window events -----------------------------------------------------------------------
  /** Dispatched after an intent / PO is created, edited, approved or deleted (AdminIntent, IntentForm, IntentCardDetails, UploadPhoto, AdminUpcomingDeliveries, DeliveryChecklist). Listened by Intent, UpcomingDeliveries. */
  intentCreated: 'intentCreated',
  /** Dispatched after a site transfer is created or updated (AdminSiteTransfer, MaterialCardDetails, MaterialTransferForm, AdminUpcomingDeliveries). Listened by MaterialTransfer, UpcomingDeliveries. */
  siteTransferCreated: 'siteTransferCreated',
  /** Dispatched after a delivery is received/updated (DeliveryChecklist). Listened by MaterialTransfer. */
  deliveryUpdated: 'deliveryUpdated',
  /** Also used as a storage key. Dispatched whenever deliveries change (intent, transfer and delivery screens). Listened by Intent, MaterialTransfer, UpcomingDeliveries. */
  upcomingDeliveryRefresh: 'upcomingDeliveryRefresh',
  /** Dispatched after a leave or reimbursement status change (AdminLeaves, AdminReimbursements). Listened by DashboardLayout (badge counts). */
  pendingCountsRefresh: 'pending-counts:refresh',
  /** Dispatched after an admin updates a leave (AdminLeaves). Listened by MyAttendance. */
  leaveUpdated: 'leave-updated',

  // localStorage signals (other tabs/screens see them through the `storage` event) --------
  /** Set by the intent screens (see intentCreated). Read by Intent, UpcomingDeliveries. */
  intentRefresh: 'intentRefresh',
  /** Set by the site-transfer screens (see siteTransferCreated). Read by MaterialTransfer, UpcomingDeliveries. */
  siteTransferRefresh: 'siteTransferRefresh',
  /** Set by DeliveryChecklist. Read by MaterialTransfer. */
  deliveryRefresh: 'deliveryRefresh',
};
