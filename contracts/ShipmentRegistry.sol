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

    struct DeliverySignature {
        string shipmentId;
        bytes32 signatureHash;
        uint256 timestamp;
        bool exists;
        address recordedBy;
    }

    mapping(string => Shipment) public shipments;
    mapping(string => DeliverySignature) public deliverySignatures;

    event ShipmentRegistered(string indexed shipmentId, string status, string location, uint256 timestamp, address indexed updatedBy);
    event ShipmentUpdated(string indexed shipmentId, string status, string location, uint256 timestamp, address indexed updatedBy);
    event DeliverySignatureRecorded(string indexed shipmentId, bytes32 indexed signatureHash, uint256 timestamp, address indexed recordedBy);

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

    function recordDeliverySignature(string calldata shipmentId, bytes32 signatureHash) external {
        require(shipments[shipmentId].timestamp != 0, "Shipment not registered");
        require(signatureHash != bytes32(0), "Invalid signature hash");
        require(!deliverySignatures[shipmentId].exists, "Signature already recorded");
        deliverySignatures[shipmentId] = DeliverySignature(shipmentId, signatureHash, block.timestamp, true, msg.sender);
        emit DeliverySignatureRecorded(shipmentId, signatureHash, block.timestamp, msg.sender);
    }

    function verifyDeliverySignature(string calldata shipmentId) external view returns (bytes32, uint256, bool, address) {
        DeliverySignature memory d = deliverySignatures[shipmentId];
        return (d.signatureHash, d.timestamp, d.exists, d.recordedBy);
    }

    function verifyShipment(string calldata shipmentId) external view returns (string memory, string memory, uint256, address) {
        Shipment memory s = shipments[shipmentId];
        require(s.timestamp != 0, "Shipment not registered");
        return (s.status, s.location, s.timestamp, s.updatedBy);
    }
}
