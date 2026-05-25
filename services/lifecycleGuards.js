const allowedTransitions = {

  pending: [
    "confirmed",
    "cancelled"
  ],

  confirmed: [
    "started",
    "cancelled",
    "reschedule_requested"
  ],

  started: [
    "completed",
    "cancelled"
  ],

  completed: [],

  cancelled: []

};

export function assertTransition(
  currentState,
  nextState
) {

  const allowed =
    allowedTransitions[currentState] || [];

  if (!allowed.includes(nextState)) {

    throw new Error(
      `Invalid transition: ${currentState} -> ${nextState}`
    );

  }

}
