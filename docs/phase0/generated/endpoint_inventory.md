# Endpoint inventory (generated from the route table)

| Method | Path | Access | Handler |
|---|---|---|---|
| GET | `/` | PUBLIC | `home` |
| GET | `/api/admin/pharmacies` | admin | `list_pharmacies_with_branches` |
| GET | `/api/admin/pharmacies/pending` | admin | `pending_verifications_endpoint` |
| POST | `/api/admin/pharmacies/{pharmacy_id}/verification` | admin | `review_verification_endpoint` |
| POST | `/api/admin/users` | admin | `create_user_with_role` |
| PATCH | `/api/admin/users/{user_id}/role` | admin | `change_platform_role` |
| GET | `/api/branches/public` | PUBLIC | `get_public_branches_endpoint` |
| GET | `/api/branches/{branch_id}` | authenticated | `get_branch_endpoint` |
| PATCH | `/api/branches/{branch_id}` | authenticated | `update_branch_endpoint` |
| POST | `/api/catalogue/admin/sync/start` | admin | `start_sync` |
| GET | `/api/catalogue/admin/sync/status` | admin | `sync_status` |
| GET | `/api/catalogue/categories` | PUBLIC | `catalogue_categories` |
| GET | `/api/catalogue/products` | PUBLIC | `catalogue_products` |
| GET | `/api/catalogue/products/{listing_id}` | PUBLIC | `catalogue_product` |
| GET | `/api/catalogue/products/{listing_id}/offers` | PUBLIC | `catalogue_product_offers` |
| GET | `/api/inventory` | pharmacy staff (branch-verified) | `get_inventory` |
| POST | `/api/inventory` | pharmacy staff (branch-verified) | `create_inventory` |
| GET | `/api/inventory/dashboard` | pharmacy staff (branch-verified) | `inventory_dashboard` |
| POST | `/api/inventory/intake/import` | pharmacy staff (branch-verified) | `confirm_inventory_import` |
| POST | `/api/inventory/intake/manual` | pharmacy staff (branch-verified) | `manual_stock_intake` |
| POST | `/api/inventory/intake/validate-csv` | pharmacy staff (branch-verified) | `validate_csv_intake` |
| GET | `/api/inventory/{inventory_id}` | pharmacy staff (branch-verified) | `get_inventory_by_id` |
| PATCH | `/api/inventory/{inventory_id}/details` | pharmacy staff (branch-verified) | `change_inventory_details` |
| GET | `/api/inventory/{inventory_id}/movements` | pharmacy staff (branch-verified) | `get_inventory_movements` |
| PATCH | `/api/inventory/{inventory_id}/quantity` | pharmacy staff (branch-verified) | `change_inventory_quantity` |
| GET | `/api/me/branches` | authenticated | `my_branches_endpoint` |
| POST | `/api/pharmacies` | authenticated | `create_pharmacy_endpoint` |
| GET | `/api/pharmacies/{pharmacy_id}` | authenticated | `get_pharmacy_endpoint` |
| PATCH | `/api/pharmacies/{pharmacy_id}` | authenticated | `update_pharmacy_endpoint` |
| GET | `/api/pharmacies/{pharmacy_id}/branches` | authenticated | `get_pharmacy_branches_endpoint` |
| POST | `/api/pharmacies/{pharmacy_id}/branches` | authenticated | `create_branch_endpoint` |
| GET | `/api/pharmacies/{pharmacy_id}/staff` | authenticated | `list_staff_endpoint` |
| POST | `/api/pharmacies/{pharmacy_id}/staff` | authenticated | `grant_staff_endpoint` |
| DELETE | `/api/pharmacies/{pharmacy_id}/staff/{staff_user_id}` | authenticated | `revoke_staff_endpoint` |
| POST | `/api/pharmacies/{pharmacy_id}/verification` | authenticated | `submit_verification_endpoint` |
| POST | `/api/prescriptions` | authenticated | `upload_prescription` |
| GET | `/api/prescriptions/pharmacy/queue` | pharmacy staff (branch-verified) | `pharmacy_prescription_queue` |
| GET | `/api/prescriptions/pharmacy/{prescription_id}` | pharmacy staff (branch-verified) | `pharmacy_prescription_detail` |
| GET | `/api/prescriptions/{prescription_id}` | authenticated | `read_prescription` |
| POST | `/api/prescriptions/{prescription_id}/review` | pharmacy staff (branch-verified) | `submit_prescription_review` |
| GET | `/api/security/events` | admin | `list_events` |
| GET | `/api/security/events/stats` | admin | `event_stats` |
| POST | `/auth/change-password` | authenticated | `change_password` |
| GET | `/dashboard-history` | authenticated | `get_dashboard_history` |
| GET | `/history` | authenticated | `get_history` |
| POST | `/login` | PUBLIC | `login` |
| POST | `/logout` | authenticated | `logout` |
| POST | `/logout-all` | authenticated | `logout_all` |
| POST | `/predict` | authenticated | `predict` |
| POST | `/predict-anemia` | authenticated | `predict_anemia_endpoint` |
| POST | `/predict-diabetes` | authenticated | `predict_diabetes_endpoint` |
| POST | `/predict-fracture` | authenticated | `predict_fracture_endpoint` |
| POST | `/predict-heart` | authenticated | `predict_heart_endpoint` |
| POST | `/predict-kidney` | authenticated | `predict_kidney_endpoint` |
| POST | `/predict-skin-defense` | authenticated | `predict_skin_defense_endpoint` |
| GET | `/predict-skin-defense/health` | admin | `skin_defense_health` |
| POST | `/register` | PUBLIC | `register` |
| POST | `/save-history` | authenticated | `save_history` |
| GET | `/users` | admin | `get_all_users` |
| GET | `/users/me` | authenticated | `read_users_me` |
| GET | `/verify-token` | authenticated | `verify_token` |
