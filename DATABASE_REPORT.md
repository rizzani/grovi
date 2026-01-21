# Database Inspection Report

**Generated:** 2026-01-21T17:25:14.571Z  
**Database ID:** grovi_staging

---

🔍 Inspecting Appwrite Database...

Database ID: grovi_staging

📊 Comparing with previous report from 1/21/2026, 12:24:17 PM

📦 Fetching collections...
✓ Found 14 collection(s) (1038ms)


============================================================
Collection: Categories (categories)
============================================================

📋 Attributes (6) [361ms]:
  - path_names: string[array] (optional)
  - depth: integer (optional)
  - name: string (required)
  - parent_id: string (optional)
  - path_ids: string[array] (optional)
  - slug: string (required)

🔍 Indexes (3) [183ms]:
  - slug: key on [slug]
  - parent_id: key on [parent_id]
  - idx_name_fulltext: fulltext on [name]

📄 Documents: 22 [447ms]

✓ Data Quality: Good (checked 10 documents)

📝 Sample document structure:
  - depth: number = 0
  - path_names: array = [1 items]
  - name: string = Groceries
  - parent_id: object = null
  - path_ids: array = [1 items]
  - slug: string = groceries
  - $id: string = cat_groceries
  - $sequence: number = 1
  - $createdAt: string = 2026-01-03T01:49:12.040+00:00
  - $updatedAt: string = 2026-01-03T01:49:12.040+00:00
  - $permissions: array = [0 items]
  - $databaseId: string = grovi_staging
  - $collectionId: string = categories

============================================================
Collection: Products (products)
============================================================

📋 Attributes (15) [153ms]:
  - variants: string (optional)
  - updated_at: string (required)
  - category_path_ids: string[array] (required)
  - brand: string (optional)
  - description: string (optional)
  - unit_size: string (optional)
  - category_leaf_id: string (required)
  - primary_image_file_id: string (required)
  - title: string (required)
  - package_quantity: integer (optional)
  - category_path: string[array] (optional)
  - primary_image_url: string (required)
  - sku: string (required)
  - images: string (required)
  - net_weight: string (optional)

🔍 Indexes (9) [379ms]:
  - external_source_external_id: key on [external_id]
  - category_leaf_id: key on [category_leaf_id]
  - sku: key on [sku]
  - primary_image_file_id: key on [primary_image_file_id]
  - idx_title_fulltext: fulltext on [title]
  - idx_brand_search: key on [brand]
  - idx_category_leaf_id_search: key on [category_leaf_id]
  - idx_external_source_in_stock: key on [external_source]
  - idx_sku_unique_search: unique on [sku]

📄 Documents: 1050 [349ms]

✓ Data Quality: Good (checked 10 documents)

📝 Sample document structure:
  - variants: string = [{"name":"flavor","value":"Variety Pack"}]
  - category_path_ids: array = [2 items]
  - updated_at: string = 2026-01-12T05:20:22.868Z
  - brand: string = Kiss
  - description: string = The KISS Family Savers assorted pack, 16 units, of...
  - unit_size: object = null
  - category_leaf_id: string = cat_cookies-desserts-and-ice-cream
  - primary_image_file_id: string = 6958758cedf5151f9a47
  - title: string = Kiss Assorted Cream-Filled Cupcake
  - category_path: array = [2 items]
  - package_quantity: number = 16
  - primary_image_url: string = https://nyc.cloud.appwrite.io/v1/storage/buckets/p...
  - sku: string = GV-0fBk0BtCAfns
  - images: string = [{"fileId":"6958758cedf5151f9a47","url":"https://n...
  - net_weight: object = null
  - $id: string = 6958759a0030e6ef187a
  - $sequence: number = 1
  - $createdAt: string = 2026-01-03T01:49:14.666+00:00
  - $updatedAt: string = 2026-01-12T05:20:31.328+00:00
  - $permissions: array = [0 items]
  - $databaseId: string = grovi_staging
  - $collectionId: string = products

============================================================
Collection: Image Sources (image_sources)
============================================================

📋 Attributes (4) [137ms]:
  - source_url: string (required)
  - fileId: string (required)
  - stored_image_url: string (required)
  - source_url_hash: string (required)

🔍 Indexes (2) [176ms]:
  - source_url_hash: key on [source_url_hash]
  - file_id_lookup: key on [fileId]

📄 Documents: 4909 [438ms]

✓ Data Quality: Good (checked 10 documents)

📝 Sample document structure:
  - source_url: string = https://d31f1ehqijlcua.cloudfront.net/n/a/a/b/6/aa...
  - fileId: string = 6958758c768d9626525a
  - stored_image_url: string = https://nyc.cloud.appwrite.io/v1/storage/buckets/p...
  - source_url_hash: string = 079585a93d02ff7100431279013f5c7bffc4500e3fc1f5cdc9...
  - $id: string = 6958758d8812fda88f14
  - $sequence: number = 1
  - $createdAt: string = 2026-01-03T01:49:01.558+00:00
  - $updatedAt: string = 2026-01-12T03:34:39.586+00:00
  - $permissions: array = [0 items]
  - $databaseId: string = grovi_staging
  - $collectionId: string = image_sources

============================================================
Collection: SKU Registry (sku_registry)
============================================================

📋 Attributes (6) [291ms]:
  - brand: string (optional)
  - title: string (required)
  - sku: string (required)
  - manufacturer_id: string (optional)
  - unit_size: string (optional)
  - identity_key: string (required)

🔍 Indexes (2) [2046ms]:
  - identity_key: key on [identity_key]
  - sku_lookup: key on [sku]

📄 Documents: 1066 [375ms]

✓ Data Quality: Good (checked 10 documents)

📝 Sample document structure:
  - brand: string = member's selection
  - title: string = member's selection iced coffee mocha drink
  - sku: string = GV-0kpUwAokmHgp
  - unit_size: string = 296 ml
  - manufacturer_id: object = null
  - identity_key: string = brand:member's selection|title:member's selection ...
  - $id: string = 69587596003c5eb8526d
  - $sequence: number = 1
  - $createdAt: string = 2026-01-03T01:49:10.751+00:00
  - $updatedAt: string = 2026-01-03T01:49:10.751+00:00
  - $permissions: array = [0 items]
  - $databaseId: string = grovi_staging
  - $collectionId: string = sku_registry

============================================================
Collection: Profiles (profiles)
============================================================

📋 Attributes (6) [540ms]:
  - userId: string (required)
  - name: string (optional)
  - phone: string (required)
  - email: string (required)
  - firstName: string (optional)
  - lastName: string (optional)

🔍 Indexes (1) [445ms]:
  - idx_userId: key on [userId]

📄 Documents: Unable to fetch (The current user is not authorized to perform the requested action.)

============================================================
Collection: Audit Logs (audit_logs)
============================================================

📋 Attributes (4) [158ms]:
  - userId: string (required)
  - eventType: string (required)
  - metadata: string (optional)
  - timestamp: string (required)

🔍 Indexes (3) [160ms]:
  - idx_userId: key on [userId]
  - idx_eventType: key on [eventType]
  - idx_timestamp: key on [timestamp]

📄 Documents: Unable to fetch (The current user is not authorized to perform the requested action.)

============================================================
Collection: Addresses (addresses)
============================================================

📋 Attributes (9) [396ms]:
  - userId: string (required)
  - label: string (required)
  - parish: string (required)
  - community: string (required)
  - street: string (optional)
  - houseDetails: string (optional)
  - landmarkDirections: string (required)
  - contactPhone: string (optional)
  - default: boolean (required)

🔍 Indexes (1) [851ms]:
  - idx_userId: key on [userId]

📄 Documents: Unable to fetch (The current user is not authorized to perform the requested action.)

============================================================
Collection: User Preferences (user_preferences)
============================================================

📋 Attributes (3) [147ms]:
  - userId: string (required)
  - dietaryPreferences: string[array] (optional)
  - categoryPreferences: string[array] (optional)

🔍 Indexes (1) [143ms]:
  - idx_userId: key on [userId]

📄 Documents: Unable to fetch (The current user is not authorized to perform the requested action.)

============================================================
Collection: Notification Preferences (notification_preferences)
============================================================

📋 Attributes (7) [307ms]:
  - userId: string (required)
  - pushToken: string (optional)
  - orderUpdatesEnabled: boolean (required)
  - promotionsEnabled: boolean (required)
  - pushEnabled: boolean (required)
  - emailEnabled: boolean (required)
  - smsEnabled: boolean (required)

🔍 Indexes (1) [182ms]:
  - idx_userId: key on [userId]

📄 Documents: Unable to fetch (The current user is not authorized to perform the requested action.)

============================================================
Collection: Payment Methods (payment_methods)
============================================================

📋 Attributes (6) [156ms]:
  - userId: string (required)
  - type: string (required)
  - brand: string (optional)
  - last4: string (optional)
  - maskedNumber: string (optional)
  - label: string (optional)

🔍 Indexes (1) [241ms]:
  - idx_userId: key on [userId]

📄 Documents: Unable to fetch (The current user is not authorized to perform the requested action.)

============================================================
Collection: Store Brands (store_brand)
============================================================

📋 Attributes (7) [390ms]:
  - name: string (required)
  - slug: string (optional)
  - website_url: string (optional)
  - logo_url: string (optional)
  - currency: string (optional)
  - country_code: string (required)
  - is_active: boolean (required)

🔍 Indexes (1) [149ms]:
  - idx_brand_slug_unique: key on [slug]

📄 Documents: Unable to fetch (The current user is not authorized to perform the requested action.)

============================================================
Collection: Store Locations (store_location)
============================================================

📋 Attributes (10) [185ms]:
  - brand_id: string (required)
  - name: string (required)
  - display_name: string (required)
  - slug: string (required)
  - parish: string (optional)
  - address_line1: string (optional)
  - address_line2: string (optional)
  - phone: string (optional)
  - is_active: boolean (required)
  - priority: integer (optional)

🔍 Indexes (1) [195ms]:
  - idx_is_active: key on [is_active]

📄 Documents: Unable to fetch (The current user is not authorized to perform the requested action.)

============================================================
Collection: Store Location Product (store_location_product)
============================================================

📋 Attributes (14) [327ms]:
  - product_id: string (required)
  - store_location_id: string (required)
  - brand_id: string (required)
  - source_key: string (optional)
  - external_id: string (optional)
  - external_url: string (optional)
  - price_currency: string (optional)
  - category_leaf_id: string (optional)
  - category_path_ids: string[array] (optional)
  - price_jmd_cents: integer (required)
  - in_stock: boolean (required)
  - first_seen_at: datetime (optional)
  - last_seen_at: datetime (optional)
  - content_hash: string (optional)

🔍 Indexes (7) [150ms]:
  - idx_product_location: key on [product_id, store_location_id]
  - idx_store_location: key on [store_location_id]
  - idx_brand: key on [brand_id]
  - idx_in_stock: key on [in_stock]
  - idx_store_stock: key on [store_location_id, in_stock]
  - idx_category_leaf: key on [category_leaf_id]
  - idx_price: key on [price_jmd_cents]

📄 Documents: 1050 [207ms]

✓ Data Quality: Good (checked 10 documents)

📝 Sample document structure:
  - product_id: string = 6958759a0030e6ef187a
  - store_location_id: string = 696866170025e1956698
  - brand_id: string = 6968640e00390e5b9cb2
  - source_key: string = pricesmart
  - external_id: string = kiss-assorted-cream-filled-cupcake-pack-16-units-5...
  - external_url: string = https://www.pricesmart.com/en-jm/product/kiss-asso...
  - price_currency: string = JMD
  - category_leaf_id: string = cat_cookies-desserts-and-ice-cream
  - category_path_ids: array = [2 items]
  - price_jmd_cents: number = 99900
  - in_stock: boolean = true
  - first_seen_at: string = 2026-01-03T01:48:57.889+00:00
  - last_seen_at: string = 2026-01-12T05:20:22.868+00:00
  - content_hash: string = b09be885bebb42e08e14260b4f0ed3d7a627f457c11a5a265f...
  - $id: string = 69691011002706f37cd5
  - $sequence: number = 1
  - $createdAt: string = 2026-01-15T16:04:34.759+00:00
  - $updatedAt: string = 2026-01-15T16:38:01.687+00:00
  - $permissions: array = [0 items]
  - $databaseId: string = grovi_staging
  - $collectionId: string = store_location_product

============================================================
Collection: Search Analytics (search_analytics)
============================================================

📋 Attributes (5) [147ms]:
  - userId: string (optional)
  - query: string (required)
  - timestamp: string (required)
  - resultCount: integer (required)
  - isNoResult: boolean (required)

🔍 Indexes (3) [196ms]:
  - idx_userId: key on [userId]
  - idx_timestamp: key on [timestamp]
  - idx_isNoResult: key on [isNoResult]

📄 Documents: Unable to fetch (The current user is not authorized to perform the requested action.)


============================================================
🔎 SEARCH REQUIREMENTS CHECK
============================================================

✓ products: EXISTS
  - Attributes: 15
  - Indexes: 9
  - Documents: 1050
  - Has 'name' attribute: ✗
  - Has 'sku' attribute: ✓
  - Has full-text index on 'name': ✗ (recommended)

✗ brands: MISSING

✓ categories: EXISTS
  - Attributes: 6
  - Indexes: 3
  - Documents: 22
  - Has 'name' attribute: ✓
  - Has full-text index on 'name': ✓

✗ store_locations: MISSING

✓ store_location_product: EXISTS
  - Attributes: 14
  - Indexes: 7
  - Documents: 1050
  - Has 'product_id' attribute: ✓
  - Has 'store_location_id' attribute: ✓
  - Has 'brand_id' attribute: ✓
  - Has 'in_stock' attribute: ✓
  - Has 'price_jmd_cents' attribute: ✓
  - Has 'idx_in_stock' index: ✓
  - Has 'idx_store_stock' index: ✓
  - Has 'idx_brand' index: ✓
  - Has 'idx_category_leaf' index: ✓


============================================================
💡 RECOMMENDATIONS
============================================================

Missing collections that need to be created:
  - brands
  - store_locations

⚠️  products: Consider adding full-text index on 'name' for better search performance


============================================================
🔗 RELATIONSHIP INTEGRITY CHECK
============================================================

Checking store_location_product relationships...
⚠️  Found 10 orphaned store location references (in sample)
⚠️  Found 10 orphaned brand references (in sample)

Checking products -> categories relationships...
✓ All product category references valid


============================================================
⚡ PERFORMANCE SUMMARY
============================================================

Total inspection time: 19491ms (19.49s)
Total API request time: 11007ms
Average per collection: 786ms

⚠️  Slow collections (>1000ms):
  - SKU Registry: 2712ms
  - Addresses: 1247ms


============================================================
📈 CHANGES SINCE LAST INSPECTION
============================================================

✓ No changes detected


✅ Inspection complete!


---

*Report auto-generated by `scripts/inspect-database.ts`*
