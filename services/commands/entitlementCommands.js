import crypto from "crypto";

export function createEntitlementCommand({

  studentId,

  enrollmentId,

  packageId,

  credits,

  createdBy,

  reason

}) {

  return {

    commandId:
      crypto.randomUUID(),

    type:
      "CreateEntitlement",

    studentId,

    enrollmentId,

    packageId,

    credits,

    createdBy,

    reason,

    createdAt:
      new Date()

  };

}


export function reserveEntitlementCommand(
  {
    studentId,
    lessonId,
    credits,
    reservedBy,
    reason
  }
) {

  return {

    commandId:
      crypto.randomUUID(),

    type:
      "ReserveEntitlement",

    studentId,

    lessonId,

    credits,

    reservedBy,

    reason,

    createdAt:
      new Date()

  };

}


export function releaseEntitlementCommand(
  {
    studentId,
    lessonId,
    credits,
    releasedBy,
    reason
  }
) {

  return {

    commandId:
      crypto.randomUUID(),

    type:
      "ReleaseEntitlement",

    studentId,

    lessonId,

    credits,

    releasedBy,

    reason,

    createdAt:
      new Date()

  };

}


export function consumeEntitlementCommand(
  {
    studentId,
    lessonId,
    credits,
    consumedBy,
    reason
  }
) {

  return {

    commandId:
      crypto.randomUUID(),

    type:
      "ConsumeEntitlement",

    studentId,

    lessonId,

    credits,

    consumedBy,

    reason,

    createdAt:
      new Date()

  };

}



export function expireEntitlementCommand(
  {
    studentId,
    credits,
    expiredBy,
    reason
  }
) {

  return {

    commandId:
      crypto.randomUUID(),

    type:
      "ExpireEntitlement",

    studentId,

    credits,

    expiredBy,

    reason,

    createdAt:
      new Date()

  };

}


export function adjustEntitlementCommand(
  {
    studentId,
    adjustment,
    adjustedBy,
    reason
  }
) {

  return {

    commandId:
      crypto.randomUUID(),

    type:
      "AdjustEntitlement",

    studentId,

    adjustment,

    adjustedBy,

    reason,

    createdAt:
      new Date()

  };

}
