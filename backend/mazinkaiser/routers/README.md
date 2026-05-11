# `routers/`

FastAPI router modules will live here as we **migrate** from `mazinkaiser.api.routes`.

**Do not duplicate** route handlers — one registration path only. Prefer import re-exports during migration:

```python
# future: mazinkaiser/routers/cockpit.py
from mazinkaiser.api.routes import cockpit  # temporary shim
```

Once stable, physical move + import updates + PR.
