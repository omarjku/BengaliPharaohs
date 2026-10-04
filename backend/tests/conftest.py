"""Start every pytest run with an empty test.db, so reruns do not see rows left by earlier runs."""
import os

for f in ("test.db",):
    if os.path.exists(f):
        os.remove(f)
