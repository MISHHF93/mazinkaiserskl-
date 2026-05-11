# Backend package map (Prompt 1 target layout)



Canonical layout introduced incrementally. **Current code** may still live under legacy paths until refactors complete.



| Package | Role | Current implementation (today) |

|---------|------|----------------------------------|

| `mazinkaiser.api` | REST/WS façade, versioning, HTTP errors | `exception_handlers.py`, `version.py`, `routes/`, `schemas.py`, `deps.py` |

| `mazinkaiser.api.routes` | HTTP + WS routers | `cockpit`, `cognitive`, `health`, `websocket` |

| `mazinkaiser.api.schemas` | Pydantic DTOs | `schemas.py` |

| `mazinkaiser.core` | Config, logging | `config.py`, `logging.py`, `redis_client.py` |

| `mazinkaiser.db` | SQLAlchemy base + async session | stub until persistence prompts |

| `mazinkaiser.domain` | Domain enums / value objects | `modes`, `moves`, `mecha_state` |

| `mazinkaiser.middleware` | Cross-cutting HTTP | `RequestContextMiddleware` |

| `mazinkaiser.routers` | *Reserved* — thin re-exports possible | See `routers/README.md` |

| `mazinkaiser.models` | *Reserved* — ORM tables | See `models/README.md` |

| `mazinkaiser.services.ai` | AI orchestration + provider | `orchestrator`, `provider`, `prompts` |

| `mazinkaiser.services.cognitive` | **Kaiser Core brain** — intent, parse, context, instinct bridge | `services/cognitive/` |

| `mazinkaiser.simulation` | Executable digital twin kernel | `kernel`, `subsystems`, `move_execution`, **`instinct/`**, `moves_executable`, `directives`, `projection`, events |

| `mazinkaiser.services.*` | Application services | state engine (delegates to twin), memory, tactical, safety |

| `mazinkaiser.runtime` | Process singletons (MVP) | engine, memories |



### Phase 2 planned packages (additive)



Create when the corresponding prompt lands; keep contracts as **kernel / snapshot / projection** extensions:



| Planned area | Purpose |

|--------------|---------|

| `simulation/reactor_overflow` | **Photon overflow / Nova** — containment, instability, `OVERDRIVE` / `NOVA_PREP` / `CRITICAL_CORE` |

| `simulation/pilder` | Docking, separation, independent flight, resync, ejection hooks |

| `simulation/environment` | `SPACE`, `VOLCANIC`, `OCEANIC`, `URBAN`, `ATMOSPHERIC`, `UNDERGROUND` environment overlays |

| `simulation/vulnerability` | Blind spots, sync overload, self-repair / defensive recommendations |



**Note:** import `KaiserInstinctEngine` from `mazinkaiser.simulation.instinct.engine` (not from `instinct` package root) to avoid import cycles.



Planned drift reduction: route modules under `routers/`, ORM under `models/`, shared schemas under `schemas/` package (not a single file).

