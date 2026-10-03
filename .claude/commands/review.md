---
description: Refactor and efficiency review of the current changes, then smoke test
---
Launch the `reviewer` agent on the current diff. When it returns, show its ranked list.
Then ask which items to apply. Apply only the approved ones, run `make smoke` after each, and stop at the first red result.
