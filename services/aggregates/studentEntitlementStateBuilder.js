// ----------------------------------------------------
// Event Handlers Registry
// ----------------------------------------------------

const eventHandlers = {

  entitlement_created:
    applyEntitlementCreated,


  entitlement_reserved:
    applyEntitlementReserved,

  entitlement_released:
    applyEntitlementReleased,

  entitlement_consumed:
    applyEntitlementConsumed,

  entitlement_expired:
    applyEntitlementExpired,

  entitlement_adjusted:
    applyEntitlementAdjusted


};

// ----------------------------------------------------
// Aggregate Replay
// ----------------------------------------------------

export function rebuildState(
  events
) {

  const state = {

    studentId: null,

    aggregateVersion: 0,

    totalCreatedCredits: 0,

    availableCredits: 0,

    reservedCredits: 0,

    consumedCredits: 0,

    expiredCredits: 0,

    adjustmentCredits: 0

  };

  for (const event of events) {

    const handler =
      eventHandlers[event.event_type];

    if (handler) {

      handler(
        state,
        event
      );

    }

  }

  return state;

}

// ----------------------------------------------------
// Event Appliers
// ----------------------------------------------------

function applyEntitlementCreated(
  state,
  event
) {

  const payload = event.payload;

  state.studentId = payload.student_id;

  state.aggregateVersion++;

  state.totalCreatedCredits += payload.credits;

  state.availableCredits += payload.credits;

}


function applyEntitlementReserved(
  state,
  event
) {

  const payload =
    event.payload;

  state.aggregateVersion++;

  state.availableCredits -=
    payload.credits;

  state.reservedCredits +=
    payload.credits;

}


function applyEntitlementReleased(
  state,
  event
) {

  const payload =
    event.payload;

  state.aggregateVersion++;

  state.availableCredits +=
    payload.credits;

  state.reservedCredits -=
    payload.credits;

}


function applyEntitlementConsumed(
  state,
  event
) {

  const payload =
    event.payload;

  state.aggregateVersion++;

  state.reservedCredits -=
    payload.credits;

  state.consumedCredits +=
    payload.credits;

}


function applyEntitlementExpired(
  state,
  event
) {

  const payload =
    event.payload;

  state.aggregateVersion++;

  state.availableCredits -=
    payload.credits;

  state.expiredCredits +=
    payload.credits;

}


function applyEntitlementAdjusted(
  state,
  event
) {

  const payload =
    event.payload;

  state.aggregateVersion++;

  state.availableCredits +=
    payload.adjustment;

  state.adjustmentCredits +=
    payload.adjustment;

}
