# Final Year Project Documentation Input

## 1. Project Summary

Project Title: Crusher Material Sewa

Project Type: Web-based material ordering, delivery, stock, invoice, and payment management system

Project Domain: Construction material supply and logistics management

Project Overview:
Crusher Material Sewa is a full-stack web application developed to digitalize the workflow of a crusher material supply business. The system manages construction materials, contractor orders, stock control, truck-based delivery scheduling, invoice generation, payment handling, and reporting. It replaces manual paperwork and disconnected processes with a centralized role-based platform.

The application supports three major user roles:
- Admin
- Manager
- Contractor

The contractor can browse available materials, place orders, view delivery history, access invoices, and check payment history. The admin and manager can manage materials, review orders, control stock, assign trucks for delivery trips, generate invoices, record payments, and monitor reports.

The main purpose of the project is to improve operational efficiency, reduce manual errors, maintain better stock visibility, simplify contractor ordering, and support business decision-making through reporting features.

## 2. Problem Statement

Traditional crusher material businesses often handle orders, stock updates, truck assignments, delivery records, invoices, and payments manually. This causes several problems such as:
- inaccurate stock tracking
- delayed order approval and delivery coordination
- difficulty in tracking payment status
- poor record management
- time-consuming reporting
- lack of transparency for contractors

This project solves those issues by providing an integrated digital platform that manages the complete workflow from material listing to payment completion.

## 3. Objectives

Main Objective:
To develop a web-based management system for crusher material supply that automates ordering, stock management, delivery tracking, invoice generation, payment recording, and report analysis.

Specific Objectives:
- To allow contractors to place orders online for available crusher materials
- To manage material information, rates, images, and available stock
- To support order approval and rejection by authorized staff
- To track stock production and manual stock adjustments
- To assign trucks and manage delivery trips for approved orders
- To generate invoices for completed or approved business transactions
- To handle payment records including digital payment integration and manual payment recording
- To provide summary reports for sales, stock, payments, and delivery activity
- To implement role-based access for secure system usage

## 4. Existing System / Traditional Method

Before developing this system, crusher businesses commonly rely on phone calls, handwritten records, notebooks, paper bills, and verbal coordination for orders and deliveries. This traditional process is difficult to manage when the business grows. It creates risk in stock mismatch, forgotten payments, invoice confusion, duplicate records, and weak communication between contractors and management.

## 5. Proposed System

The proposed system is a modern web-based platform built using React for the frontend and Node.js with Express and MongoDB for the backend. It provides a centralized environment where all material supply activities can be managed efficiently.

Key capabilities of the proposed system:
- material catalog management
- contractor registration and login
- role-based dashboard
- online order placement
- order approval workflow
- stock deduction on approval
- truck management
- delivery trip creation and status tracking
- invoice generation
- payment management
- reporting dashboard

## 6. Technology Stack

Frontend:
- React 19
- Vite
- Tailwind CSS
- React Router
- React Hot Toast

Backend:
- Node.js
- Express.js
- MongoDB
- Mongoose

Authentication and Security:
- JSON Web Token (JWT)
- bcrypt password hashing
- role-based route protection

Other Libraries and Tools:
- Multer for image upload
- Morgan for API logging
- CORS for frontend-backend communication
- Nodemon for backend development

## 7. System Modules

### 7.1 Authentication Module
- User registration and login
- JWT-based session handling
- Role-based protected routes
- Admin seed account support

### 7.2 User and Role Management Module
- Admin can create and manage users
- Roles include Admin, Manager, and Contractor
- User activity status can be controlled

### 7.3 Material Management Module
- Add new crusher materials
- Set rate per cubic metre
- Upload material images
- Update material details
- Delete material records
- Maintain available stock

### 7.4 Order Management Module
- Contractors can place orders for one or more materials
- Order total is calculated automatically
- Orders remain pending until reviewed
- Admin or Manager can approve or reject orders
- Stock is deducted automatically after approval

### 7.5 Stock Management Module
- Production entry increases stock
- Manual adjustments increase or decrease stock
- Inventory logs track stock changes
- Production logs keep a record of produced quantity

### 7.6 Truck Management Module
- Add and manage trucks
- Store truck name, plate number, capacity, and activity status
- Prevent assignment of inactive trucks

### 7.7 Delivery Management Module
- Delivery trips can be created only for approved orders
- Delivery quantity is validated against ordered quantity
- Truck capacity is checked before assignment
- Busy trucks cannot be assigned to another active trip
- Trip statuses include pending, in transit, delivered, and cancelled
- Order delivery status is updated according to trip progress

### 7.8 Invoice Management Module
- Invoices are generated for approved orders
- Unique invoice numbers are assigned
- Contractors can view their own invoices
- Admin and Manager can view all invoices

### 7.9 Payment Management Module
- Payment records are stored against orders
- Supports eSewa digital payment initiation and verification
- Supports manual payment recording by staff
- Tracks payment statuses such as initiated, pending, complete, failed, and refunded
- Updates order payment status automatically

### 7.10 Reporting Module
- Sales summary
- Stock summary
- Payment summary
- Delivery summary
- Monthly revenue summary
- Top selling materials
- Date-range based filtering for analysis

## 8. Core Workflow of the System

1. Admin or Manager adds materials and available stock.
2. Contractor logs into the system and places an order.
3. The order is stored with pending approval status.
4. Admin or Manager reviews the order.
5. If approved, stock is deducted automatically.
6. Delivery trips are assigned using available trucks.
7. Delivery progress is tracked until completion.
8. Invoice is generated for the order.
9. Contractor pays through eSewa or staff records manual payment.
10. Reports are generated for management and analysis.

## 9. Database Entities

Main entities used in the project:
- User
- Material
- Order
- DeliveryTrip
- Truck
- Invoice
- Payment
- InventoryLog
- ProductionLog

Relationship overview:
- One contractor can create many orders
- One order can contain many material items
- One order can have many delivery trips
- One order can have one invoice
- One order can have multiple payments
- One material can appear in multiple orders and stock logs
- One truck can serve multiple delivery trips over time

## 10. Complete Feature List for Documentation

This section can be used in final documentation to describe the full intended system scope. It includes features that are already implemented and features that are planned to be completed before final submission.

### 10.1 Implemented Features

- Role-based authentication and authorization
- Admin account seeding
- Contractor self-registration and login
- User management by admin
- Material CRUD with image upload
- Real-time stock-aware order placement
- Approval and rejection workflow for orders
- Stock deduction after order approval
- Stock production entry
- Manual stock adjustment logs
- Inventory log tracking
- Truck management and capacity validation
- Delivery trip creation and status tracking
- Invoice generation and invoice viewing
- eSewa payment initiation and callback handling
- Manual payment entry
- Payment summary and financial tracking
- Report dashboard with sales, stock, payment, and delivery insights

### 10.2 Features Planned to Be Completed Before Submission

- Email notification for important events such as order approval, invoice generation, and payment updates
- SMS notification for delivery updates and order status
- Printable PDF export for reports and invoices
- Improved contractor profile and account management
- Enhanced dashboard visualization and analytics
- Better error handling and user feedback messages
- Final UI polishing and usability improvements
- Additional testing and validation for production readiness

### 10.3 Future Enhancements After Submission

- Mobile application support
- GPS-based truck tracking
- Demand prediction and advanced analytics
- Multi-branch crusher management
- Customer feedback and complaint handling module
- Backup and restore features
- Audit trail and advanced activity monitoring

## 11. Advantages of the System

- Reduces manual paperwork
- Improves stock accuracy
- Makes order management faster and more transparent
- Helps coordinate trucks and deliveries properly
- Maintains payment and invoice history digitally
- Supports faster report generation
- Improves accountability and decision-making

## 12. Current Limitations

- The system depends on internet and server availability
- Some planned communication features may still be under final integration at documentation time
- Mobile app version is not currently implemented
- Advanced analytics and forecasting are limited in the current version
- External payment integration depends on provider response and configuration

## 13. Suggested Future Enhancements

- Mobile application support
- Advanced SMS and email notification integration
- GPS-based truck tracking
- Advanced analytics and demand prediction
- Multi-branch crusher management
- Customer feedback and complaint module
- Printable PDF reports for all major modules
- Backup and restore features

## 14. Conclusion

Crusher Material Sewa is a practical and useful final year project that solves real-world business problems in construction material supply management. It integrates ordering, stock control, delivery planning, invoice generation, payments, and reporting into one centralized platform. The system improves accuracy, efficiency, transparency, and record keeping. This project demonstrates the practical use of modern web technologies to digitize traditional business operations.

---

## 15. Ready-to-Paste ChatGPT Prompt

Copy the text below and paste it into ChatGPT:

```text
I want you to write a complete Final Year Project documentation/report for my project in formal academic style. Make it simple, clear, human-written, and suitable for a Bachelor-level final report. Use proper headings, paragraph formatting, and structured explanation. Where useful, include bullet points and tables. Do not make the language too complex.

Project details:

Project Title: Crusher Material Sewa

Project Type: Web-based crusher material ordering, stock, delivery, invoice, payment, and reporting management system

Project Domain: Construction material supply and logistics

Project Overview:
Crusher Material Sewa is a full-stack web application developed to digitalize the workflow of a crusher material supply business. It manages construction materials, contractor orders, stock control, truck-based delivery scheduling, invoice generation, payment handling, and reporting. The system replaces manual paperwork and disconnected processes with a centralized role-based platform.

User Roles:
1. Admin
2. Manager
3. Contractor

Main Features:
- User registration and login
- Role-based authentication and authorization
- User management
- Material management with image upload
- Stock management
- Production entry and stock adjustment logs
- Online order placement by contractors
- Order approval and rejection by admin/manager
- Automatic stock deduction after approval
- Truck management
- Delivery trip assignment and tracking
- Invoice generation
- Payment management
- eSewa digital payment support
- Manual payment recording
- Sales, stock, payment, and delivery reports
- Email notification support for major workflow events
- SMS notification support for selected workflow updates
- Printable report and invoice support
- Improved dashboard visualization and usability features

Technology Stack:
- Frontend: React 19, Vite, Tailwind CSS, React Router
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Authentication: JWT, bcrypt
- Other tools: Multer, Morgan, CORS, Nodemon

Database Entities:
- User
- Material
- Order
- DeliveryTrip
- Truck
- Invoice
- Payment
- InventoryLog
- ProductionLog

System Workflow:
1. Admin or Manager adds materials and available stock.
2. Contractor logs in and places an order.
3. Order remains pending.
4. Admin or Manager approves or rejects the order.
5. If approved, stock is deducted automatically.
6. Delivery trips are created using trucks.
7. Delivery progress is tracked.
8. Invoice is generated.
9. Payment is completed through eSewa or manual entry.
10. Reports are viewed by management.

Objectives:
- To digitize crusher material business operations
- To reduce manual errors in stock, orders, and payment records
- To improve delivery coordination
- To provide accurate invoices and reports
- To maintain a secure role-based management system

Please generate the full documentation with these chapters:
1. Title Page content
2. Abstract
3. Acknowledgement
4. Table of Contents
5. Chapter 1: Introduction
6. Chapter 2: Literature Review
7. Chapter 3: System Analysis and Requirements
8. Chapter 4: System Design
9. Chapter 5: Implementation and Testing
10. Chapter 6: Conclusion and Future Enhancements
11. References
12. Appendices

Also include:
- problem statement
- objectives
- scope of the project
- feasibility study
- functional requirements
- non-functional requirements
- system architecture
- module description
- database design
- ER description
- use case description
- testing strategy
- advantages and limitations
- future scope

In the documentation, clearly distinguish between:
- features already implemented
- features planned to be completed before final submission
- future enhancements after project submission

If any section needs extra academic detail, make a reasonable assumption based on the project information above. Keep the content realistic and related to this actual project.
```

## 16. Short Prompt Version

If you want a shorter prompt, use this:

```text
Write a complete Final Year Project report for my project "Crusher Material Sewa" in simple academic language. It is a web-based construction material ordering and management system with modules for authentication, user management, material management, stock control, order approval, truck delivery management, invoice generation, payment handling including eSewa, reporting, email notification, SMS notification, printable reports, and dashboard improvements. The stack is React, Vite, Tailwind CSS, Node.js, Express, MongoDB, JWT, bcrypt, and Multer. The system has Admin, Manager, and Contractor roles. Clearly separate implemented features, features planned before submission, and future enhancements. Please write all major chapters including abstract, introduction, literature review, system analysis, design, implementation, testing, conclusion, future scope, references, and appendices.
```
