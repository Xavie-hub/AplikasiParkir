# ERD ParkirKu

```mermaid
erDiagram
    USERS ||--o{ PARKING_TRANSACTIONS : membuat
    USERS ||--o{ ACTIVITY_LOGS : melakukan
    VEHICLES |o--o{ PARKING_TRANSACTIONS : memiliki
    PARKING_AREAS ||--o{ PARKING_TRANSACTIONS : menampung

    USERS {
        bigint id PK
        varchar name
        varchar username UK
        enum role
        enum status
        datetime last_login_at
    }
    PARKING_AREAS {
        bigint id PK
        varchar name
        varchar code UK
        smallint capacity
        enum status
    }
    PARKING_RATES {
        bigint id PK
        varchar name
        enum vehicle_type
        decimal rate_per_hour
        enum status
    }
    VEHICLES {
        bigint id PK
        varchar plate_number UK
        varchar owner_name
        enum vehicle_type
    }
    PARKING_TRANSACTIONS {
        bigint id PK
        varchar ticket_code UK
        bigint vehicle_id FK
        bigint area_id FK
        bigint created_by FK
        datetime entry_at
        datetime exit_at
        decimal total_amount
        enum status
    }
    ACTIVITY_LOGS {
        bigint id PK
        bigint user_id FK
        varchar action_name
        varchar module_name
        datetime created_at
    }
```

Tarif dipisahkan sebagai tabel master karena dapat berkembang menjadi tarif berdasarkan jam, hari, atau jenis layanan tanpa mengubah tabel transaksi. Nilai `rate_per_hour` dan snapshot plat/jenis kendaraan disalin ke transaksi agar riwayat lama tidak berubah ketika master tarif diedit.
