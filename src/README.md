# Source Layout

```text
src/
├── clients/
│   ├── mobile-h5/      # Mobile browser client
│   └── miniprogram/    # WeChat miniprogram client placeholder
├── backend/            # Backend/cloud functions
└── shared/             # Cross-client content and pure domain data
```

The Mobile H5 client uses `src/shared/unit-01.js` for lesson content. Future iOS or miniprogram clients should reuse the shared content shape instead of duplicating unit data inside a platform UI layer.
