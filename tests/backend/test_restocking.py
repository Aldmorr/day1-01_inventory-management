"""Tests for the restocking endpoint's server-side authority on prices/SKUs."""


def test_create_restocking_order_resolves_catalog_fields(client):
    """Client-supplied unit_cost/name/category are ignored — server uses catalog."""
    response = client.post(
        "/api/restocking/orders",
        json={
            "items": [
                {
                    "item_sku": "PCB-001",
                    "quantity": 10,
                    # Attacker-supplied values that should be ignored
                    "item_name": "Free Diamonds",
                    "category": "Mechanical",
                    "unit_cost": 0.01,
                }
            ],
            "budget": 1000,
        },
    )
    assert response.status_code == 200
    order = response.json()
    assert len(order["items"]) == 1
    item = order["items"][0]
    assert item["item_sku"] == "PCB-001"
    assert item["item_name"] == "Single Layer PCB Assembly"
    assert item["category"] == "Circuit Boards"
    assert item["unit_cost"] == 24.99
    # Total uses the real price, not the spoofed 0.01
    assert order["total_value"] == round(10 * 24.99, 2)


def test_create_restocking_order_rejects_unknown_sku(client):
    response = client.post(
        "/api/restocking/orders",
        json={
            "items": [{"item_sku": "NOT-A-REAL-SKU", "quantity": 5}],
            "budget": 1000,
        },
    )
    assert response.status_code == 400
    assert "Unknown SKU" in response.json()["detail"]


def test_create_restocking_order_rejects_zero_quantity(client):
    response = client.post(
        "/api/restocking/orders",
        json={
            "items": [{"item_sku": "PCB-001", "quantity": 0}],
            "budget": 1000,
        },
    )
    assert response.status_code == 422


def test_create_restocking_order_rejects_oversized_quantity(client):
    response = client.post(
        "/api/restocking/orders",
        json={
            "items": [{"item_sku": "PCB-001", "quantity": 10001}],
            "budget": 1_000_000_000,
        },
    )
    assert response.status_code == 422


def test_create_restocking_order_rejects_empty_items(client):
    response = client.post(
        "/api/restocking/orders",
        json={"items": [], "budget": 1000},
    )
    assert response.status_code == 422


def test_create_restocking_order_enforces_budget(client):
    response = client.post(
        "/api/restocking/orders",
        json={
            "items": [{"item_sku": "PCB-001", "quantity": 100}],
            "budget": 10,
        },
    )
    assert response.status_code == 400
    assert "exceeds budget" in response.json()["detail"]
