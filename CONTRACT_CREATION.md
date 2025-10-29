# Contract Auto-Creation Feature - Implementation Guide

## Overview

When a client accepts a proposal, the system now **automatically creates a contract** between the client and freelancer. This streamlines the workflow and ensures all accepted proposals have associated contracts ready for work to begin.

## What Happens When a Proposal is Accepted

### Automated Workflow (Transaction-based)

```
1. Accept Proposal (status → 'accepted')
   ↓
2. Reject Other Proposals (status → 'rejected')
   ↓
3. Update Project Status (status → 'awarded')
   ↓
4. CREATE CONTRACT (NEW!)
   ├─ Contract Type: Matches project type (fixed/hourly)
   ├─ Amount/Rate: From accepted proposal
   ├─ Status: 'active'
   └─ Links: Project, Client, Freelancer
```

All steps happen in a **single database transaction** - if any step fails, everything rolls back.

## Backend Implementation

### Updated Accept Proposal Endpoint

**Endpoint:** `POST /api/proposals/:id/accept`

**New Response Format:**

```json
{
  "success": true,
  "message": "Proposal accepted successfully and contract created",
  "data": {
    "proposal": {
      "id": "proposal-uuid",
      "status": "accepted",
      ...
    },
    "contract": {
      "id": "contract-uuid",
      "status": "active",
      "contract_type": "fixed",
      "agreed_amount": 4200.00,
      ...
    }
  }
}
```

### Contract Creation Logic

```javascript
// 4. Create a contract automatically
contractId = randomUUID();

// Get project details
const project = await connection.query(
  "SELECT project_type, client_id, currency FROM projects WHERE id = ?",
  [proposal.project_id]
);

// Determine contract parameters based on project type
const contractType = project.project_type; // 'fixed' or 'hourly'
const agreedAmount = contractType === "fixed" ? proposal.bid_amount : null;
const hourlyRate = contractType === "hourly" ? proposal.hourly_rate : null;

// Insert contract
await connection.query(
  `INSERT INTO contracts 
   (id, project_id, client_id, freelancer_id, contract_type, 
    status, agreed_amount, hourly_rate, currency)
   VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
  [
    contractId,
    proposal.project_id,
    project.client_id,
    proposal.freelancer_id,
    contractType,
    agreedAmount,
    hourlyRate,
    project.currency,
  ]
);
```

### Contract Types

#### Fixed Price Contract

- **agreed_amount**: Set to proposal's `bid_amount`
- **hourly_rate**: NULL
- Used when project_type is 'fixed'

#### Hourly Contract

- **agreed_amount**: NULL
- **hourly_rate**: Set to proposal's `hourly_rate`
- Used when project_type is 'hourly'

## New Contracts API

### Endpoints

#### GET /api/contracts

Get all contracts for the authenticated user.

**Query Parameters:**

- `project_id` - Filter by project
- `client_id` - Filter by client
- `freelancer_id` - Filter by freelancer
- `status` - Filter by status (active, completed, terminated)
- `limit` - Pagination limit (default: 50)
- `offset` - Pagination offset (default: 0)

**Authorization:**

- Clients see only their contracts
- Freelancers see only their contracts
- Admins see all contracts

#### GET /api/contracts/:id

Get contract details with milestones.

**Response includes:**

- Contract information
- Project details
- Client information
- Freelancer information
- Associated milestones (if any)

#### PATCH /api/contracts/:id

Update contract status or end date.

**Body:**

```json
{
  "status": "completed",
  "end_at": "2025-11-30T00:00:00Z"
}
```

**Valid Status Transitions:**

- `active` → `completed`
- `active` → `terminated`
- Cannot change from completed/terminated back to active

## Frontend Implementation

### New Pages

#### 1. MyContracts.jsx (`/contracts`)

Lists all contracts for the current user.

**Features:**

- Filter by status (All, Active, Completed, Terminated)
- Shows contract type, amount/rate, parties
- Quick actions: View Details, Mark Complete
- Color-coded status badges

**Access:**

- Available to all authenticated users (clients and freelancers)
- Shows in navbar as "Contracts"

#### 2. ContractDetail.jsx (`/contracts/:id`)

Detailed view of a single contract.

**Features:**

- Full contract information
- Client and freelancer details
- Project description
- Milestones list with status
- Actions: Mark Complete, Terminate

**Sections:**

- Contract Information (type, amount, dates)
- Parties (client & freelancer details)
- Project Description
- Milestones (if any exist)

### Enhanced MyProjects.jsx

When accepting a proposal:

```javascript
const response = await proposalsAPI.accept(proposalId);
const { contract } = response.data.data;

alert(`Proposal accepted successfully!
A contract has been created and is now active.
Contract ID: ${contract.id}`);

// Option to navigate to contract
if (window.confirm("Would you like to view the contract now?")) {
  navigate(`/contracts/${contract.id}`);
}
```

### Navigation Updates

**Navbar now includes:**

```
Projects | My Proposals | My Projects | Contracts | Profile
```

Available to all authenticated users.

## Database Schema

### Contracts Table

```sql
CREATE TABLE contracts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36),
    client_id CHAR(36),
    freelancer_id CHAR(36),
    contract_type VARCHAR(50) CHECK (contract_type IN ('fixed', 'hourly')),
    status VARCHAR(50) CHECK (status IN ('active', 'completed', 'terminated')) DEFAULT 'active',
    agreed_amount DECIMAL(10, 2),
    hourly_rate DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    start_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_at DATETIME,
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES client_profiles (id) ON DELETE CASCADE,
    FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles (id) ON DELETE CASCADE
);
```

### Relationship to Proposals

```
Proposal (accepted) ──┐
                      ├──> Contract (active)
Project ──────────────┘
```

One accepted proposal creates one active contract.

## User Workflows

### Client Workflow

1. **Post Project** → Status: 'open'
2. **Receive Proposals** from freelancers
3. **Accept Proposal**
   - Proposal status → 'accepted'
   - Other proposals → 'rejected'
   - Project status → 'awarded'
   - **Contract created** → 'active'
4. **View Contract** in "Contracts" section
5. **Work Begins** - Track via milestones
6. **Mark Complete** when work is done
   - Contract status → 'completed'
   - Contract end_at set to current time

### Freelancer Workflow

1. **Submit Proposal** for project
2. **Wait for Decision**
3. **Get Notified** (proposal accepted)
4. **View Contract** in "Contracts" section
5. **Begin Work** - Deliver milestones
6. **Mark Complete** when finished

## Status Badges & Colors

### Contract Status

| Status     | Color | Meaning                    |
| ---------- | ----- | -------------------------- |
| active     | Green | Contract is ongoing        |
| completed  | Blue  | Work finished successfully |
| terminated | Red   | Contract ended early       |

### Milestone Status

| Status    | Color  | Meaning                        |
| --------- | ------ | ------------------------------ |
| funded    | Yellow | Money escrowed, work ready     |
| in_review | Blue   | Deliverable under review       |
| released  | Green  | Payment released to freelancer |
| disputed  | Red    | Issue raised, needs resolution |

## CSS Styling

```css
/* Contract statuses */
.status-active {
  background-color: #d4edda;
  color: #155724;
  font-weight: 600;
}

.status-completed {
  background-color: #cce5ff;
  color: #004085;
}

.status-terminated {
  background-color: #f8d7da;
  color: #721c24;
}

/* Milestone statuses */
.status-funded {
  background-color: #fff3cd;
  color: #856404;
}

.status-in-review {
  background-color: #cce5ff;
  color: #004085;
}

.status-released {
  background-color: #d4edda;
  color: #155724;
  font-weight: 600;
}
```

## Error Handling

### Backend Validation

All existing proposal acceptance validations still apply:

- User must be project owner
- Proposal must be submitted/shortlisted
- Project must be 'open'
- Cannot accept already-rejected proposals

**New validation:**

- Contract creation must succeed within transaction
- Foreign key constraints must be valid

### Transaction Safety

```javascript
await transaction(async (connection) => {
  // 1. Accept proposal
  // 2. Reject others
  // 3. Update project
  // 4. CREATE CONTRACT ← If this fails, all rolls back
});
```

If contract creation fails (e.g., database error), the entire operation is rolled back:

- Proposal remains in original state
- Other proposals not rejected
- Project status unchanged

## Testing Checklist

### Backend

- [x] Accept proposal creates contract
- [x] Contract type matches project type
- [x] Fixed price contract has agreed_amount
- [x] Hourly contract has hourly_rate
- [x] Contract status is 'active' on creation
- [x] Contract links to correct project, client, freelancer
- [x] Transaction rolls back on contract creation failure
- [x] Contracts API requires authentication
- [x] Contracts filtered by user role
- [x] Contract update validates permissions

### Frontend

- [x] Contracts link in navbar
- [x] MyContracts page loads contracts
- [x] Status filters work correctly
- [x] Contract detail page shows all info
- [x] Mark complete action works
- [x] Navigate to contract after acceptance
- [x] Status badges display correctly
- [x] Milestones display if present

## API Examples

### Accept Proposal & Create Contract

```bash
POST /api/proposals/{proposalId}/accept
Authorization: Bearer <client-token>
```

**Response:**

```json
{
  "success": true,
  "message": "Proposal accepted successfully and contract created",
  "data": {
    "proposal": {
      "id": "abc-123",
      "status": "accepted",
      "bid_amount": 4200.0
    },
    "contract": {
      "id": "contract-456",
      "project_id": "project-789",
      "client_id": "client-111",
      "freelancer_id": "freelancer-222",
      "contract_type": "fixed",
      "status": "active",
      "agreed_amount": 4200.0,
      "hourly_rate": null,
      "currency": "USD",
      "start_at": "2025-10-29T15:30:00Z",
      "end_at": null
    }
  }
}
```

### Get All Contracts

```bash
GET /api/contracts?status=active
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "contract-456",
      "project_title": "React Dashboard Revamp",
      "client_name": "Jane Smith",
      "company_name": "Bright Pixel Labs",
      "freelancer_name": "John Doe",
      "contract_type": "fixed",
      "status": "active",
      "agreed_amount": 4200.0,
      "start_at": "2025-10-29T15:30:00Z"
    }
  ],
  "count": 1
}
```

### Get Contract Details

```bash
GET /api/contracts/contract-456
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "contract-456",
    "project_title": "React Dashboard Revamp",
    "project_description": "Update an existing SaaS analytics dashboard...",
    "client_name": "Jane Smith",
    "client_email": "jane.client@example.com",
    "company_name": "Bright Pixel Labs",
    "freelancer_name": "John Doe",
    "freelancer_email": "john.freelancer@example.com",
    "freelancer_bio": "Full-stack developer specialising in React...",
    "freelancer_rating": 4.9,
    "contract_type": "fixed",
    "status": "active",
    "agreed_amount": 4200.0,
    "currency": "USD",
    "start_at": "2025-10-29T15:30:00Z",
    "milestones": [
      {
        "id": "milestone-1",
        "title": "Discovery & Wireframes",
        "status": "funded",
        "amount": 1800.0,
        "due_at": "2025-11-05T00:00:00Z"
      }
    ]
  }
}
```

## Future Enhancements

### Phase 2 Features

1. **Automatic Milestone Creation**

   - Create first milestone when contract is created
   - Based on proposal's estimated_hours or bid_amount

2. **Contract Templates**

   - Predefined terms and conditions
   - Customizable per project type

3. **E-signatures**

   - Digital signature requirement
   - Contract becomes binding after both parties sign

4. **Contract Amendments**

   - Modify terms with mutual consent
   - Version history tracking

5. **Time Tracking** (for hourly contracts)

   - Log hours worked
   - Calculate amount owed
   - Generate invoices

6. **Notifications**
   - Email freelancer when contract created
   - Remind about upcoming milestones
   - Notify when contract completed

## Conclusion

The contract auto-creation feature provides:

✅ **Seamless Workflow** - No manual contract creation needed  
✅ **Data Integrity** - Transaction-based, all-or-nothing  
✅ **Clear Status Tracking** - Visual indicators throughout  
✅ **Complete API** - CRUD operations for contracts  
✅ **User-Friendly UI** - Easy navigation and management  
✅ **Future-Ready** - Foundation for milestones, payments, etc.

The system now has a complete proposal → contract → work cycle ready for production use!
