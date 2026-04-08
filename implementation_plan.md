# Implementation Plan - Location-Based Admin Access Control

The goal is to ensure that admins assigned to a specific location can only see and manage data (orders, refunds, support tickets, etc.) for their location.

## 1. SQL Script for Admin Insertion
I will provide a SQL script to:
- Insert admins and link them to specific locations.
- Roles: `super_admin` (all locations), `admin` (specific location), `staff` (specific location).

## 2. Backend Logic Updates (Validation & Fixes)

### `refundController.js`
- **`getAllRefunds`**: Modify to filter by `location_id` for location-specific admins.
- **`processRefund`**: Add security check to prevent cross-location refund processing.

### `supportController.js`
- **`adminGetAllTickets`**: Join with `Orders` and filter by `location_id`.
- **`adminGetTicketById`**: Ensure the ticket belongs to the admin's location.
- **`adminReplyTicket`**: Ensure the ticket belongs to the admin's location.

### `adminController.js`
- **`updateOrderStatus`**: Add `location_id` validation.
- **`updatePaymentStatus`**: (Already has validation).
- **`adminGetOrderDetail`**: (Already has validation).

## 3. SQL Data Insertion
I will generate a SQL block with example admin inserts.

## 4. Verification
- Validate the changes against the user's request.
