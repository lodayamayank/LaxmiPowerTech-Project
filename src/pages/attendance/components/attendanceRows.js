// src/pages/attendance/components/attendanceRows.js
// Row shape shared by the attendance register table.

/** Flat row used by the table: { key, name, employeeId, present, absent, halfDay, weekOff, paidLeave, ..., overtime }. */
export const normalizeRow = (item, key) => ({
  key,
  name: item.name,
  employeeId: item.employeeId,
  present: item.present,
  absent: item.absent,
  halfDay: item.halfDay,
  weekOff: item.weekOff,
  paidLeave: item.paidLeave,
  unpaidLeave: item.unpaidLeave,
  sickLeave: item.sickLeave,
  casualLeave: item.casualLeave,
  overtime: item.overtime,
});
