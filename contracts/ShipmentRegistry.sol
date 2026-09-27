// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ShipmentRegistry {
    struct Shipment {
        string shipmentId;
        string status;
        string location;
        uint256 timestamp;
        address updatedBy;
    }

    mapping(string => Shipment) public shipments;
    event ShipmentRegistered(string indexed shipmentId, string status, string location, uint256 timestamp, address indexed updatedBy);
    event ShipmentUpdated(string indexed shipmentId, string status, string location, uint256 timestamp, address indexed updatedBy);

    function registerShipment(string calldata shipmentId, string calldata location) external {
        require(shipments[shipmentId].timestamp == 0, "Shipment already exists");
        shipments[shipmentId] = Shipment(shipmentId, "Created", location, block.timestamp, msg.sender);
        emit ShipmentRegistered(shipmentId, "Created", location, block.timestamp, msg.sender);
    }

    function updateShipment(string calldata shipmentId, string calldata status, string calldata location) external {
        require(shipments[shipmentId].timestamp != 0, "Shipment not registered");
        shipments[shipmentId].status = status;
        shipments[shipmentId].location = location;
        shipments[shipmentId].timestamp = block.timestamp;
        shipments[shipmentId].updatedBy = msg.sender;
        emit ShipmentUpdated(shipmentId, status, location, block.timestamp, msg.sender);
    }

    function verifyShipment(string calldata shipmentId) external view returns (string memory, string memory, uint256, address) {
        Shipment memory s = shipments[shipmentId];
        require(s.timestamp != 0, "Shipment not registered");
        return (s.status, s.location, s.timestamp, s.updatedBy);
    }
}
