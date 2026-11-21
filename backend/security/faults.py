"""
Staging-only fault injection (Phase 3).

Each fault DISABLES one authorization check so that a *successful* violation can be generated
for the separate evaluation set (a correct application never produces one):

    rx_read_idor  a patient may read ANOTHER patient's prescription
    branch_hop    pharmacy staff may act on a branch they do not work at
    admin_bypass  any signed-in user passes the admin-only check

Safety: config.get_settings() refuses to start if STAGING_FAULT_INJECTION is set while
APP_ENV != "staging". The security events stay HONEST: the verified relationship is computed
from the data, so an allowed request with target_relation = other_patient / not_staff_of_branch /
non_admin is exactly the signature of a violation that succeeded.
"""
from .config import get_settings

KNOWN_FAULTS = ("rx_read_idor", "branch_hop", "admin_bypass")


def fault_active(name: str) -> bool:
    return name in get_settings().fault_injection
