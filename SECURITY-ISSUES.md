# Security Issues — KidChatbox Audit



Tracking document for the web application security audit (June 2026).



| ID | Severity | Issue | Status |

|----|----------|-------|--------|

| SEC-01 | Critical | Google/social login accepts client email without OAuth token verification (account takeover) | **fixed** |

| SEC-02 | Critical | Default JWT secret fallback when `JWT_SECRET` unset in production | **fixed** |

| SEC-03 | Critical | `xlsx` (SheetJS) dependency — prototype pollution / ReDoS, no patch available | **fixed** |

| SEC-04 | High | JWT stored in `localStorage` (XSS session theft); long token TTL | **fixed** |

| SEC-05 | High | Suspended/rejected/pending users retain API access until JWT expires | **fixed** |

| SEC-06 | High | No brute-force protection on `/api/auth/login` and `/api/auth/register` | **fixed** |

| SEC-07 | High | Missing security headers (Helmet, CSP, HSTS, X-Frame-Options) | **fixed** |

| SEC-08 | High | Public `/uploads` directory — files reachable without auth | **fixed** |

| SEC-09 | High | CORS allows all loopback origins in production | **fixed** |

| SEC-10 | High | Weak password policy; admin returns generated passwords in JSON | **fixed** |

| SEC-11 | High | npm audit: axios, react-router-dom, nodemailer, dompurify, lodash, etc. | **fixed** |

| SEC-12 | Medium | Global 15MB JSON body limit (DoS risk) | **fixed** |

| SEC-13 | Medium | SVG uploads allowed in study library (stored XSS vector) | **fixed** |

| SEC-14 | Medium | Error handler leaks internal messages on 500 responses in production | **fixed** |

| SEC-15 | Medium | Unauthenticated `/api/ai/ping` and `/api/images/status` expose config | **fixed** |

| SEC-16 | Medium | Word-of-the-day `?word=` param passed to external API without validation | **fixed** |

| SEC-17 | Medium | Vite/esbuild dev-server cross-origin response leak (dev-only) | **fixed** |



## Notes



- **SEC-04:** Auth uses httpOnly cookies only; JWT is no longer returned in login/register JSON.

- **SEC-08:** Both `/uploads/study-library` and `/uploads/quiz-images` require authentication. No public static `/uploads` mount.

- **SEC-17:** Vite dev server binds to `127.0.0.1`, `server.fs.strict` enabled, esbuild overridden to patched version.



## Verification



```bash

npm run security:verify

npm audit

npm run build

```

