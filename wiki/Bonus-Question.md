# Bonus Question

## Question

How would you detect and mitigate an Evil Twin / Rogue Access Point attack in a corporate environment?

## Answer

To detect an Evil Twin or Rogue Access Point attack in a corporate environment, the most effective approach is to deploy a `Wireless Intrusion Detection System (WIDS)` and `Wireless Intrusion Prevention System (WIPS)` as an active control layer.

These systems continuously monitor the radio frequency spectrum to identify anomalies such as:

- a corporate `SSID` being broadcast from an unregistered `BSSID`
- a downgrade in wireless encryption settings
- abnormal signal strength patterns
- unexpected wireless infrastructure behavior near authorized coverage areas

Detection should not rely only on over-the-air monitoring. It should also correlate wireless findings with wired-network telemetry, including:

- MAC address mapping
- DHCP activity
- ARP behavior
- switch-port visibility

This correlation helps determine whether an unauthorized access point has been physically connected to the internal corporate network.

## Mitigation

Once a rogue device or Evil Twin is detected, `WIPS` can mitigate the threat automatically by disrupting the connection between clients and the malicious access point.

A common approach is to transmit repeated `deauthentication` and `disassociation` frames using a two-way spoofing technique so the victim device and rogue access point cannot maintain a stable connection.

On the wired side, the organization should also isolate the threat by disabling the switch port connected to the rogue device, for example through controlled network automation or `SNMP`-driven response workflows.

## Preventive Control

As a fundamental preventive measure, the corporate wireless network should enforce `802.1X` with `EAP-TLS`.

This is important because `EAP-TLS` requires mutual certificate-based authentication. A client device will reject a fake access point if it cannot present a valid corporate server certificate, which makes Evil Twin impersonation significantly harder.

## Summary

In short:

- use `WIDS/WIPS` to detect rogue SSIDs, BSSIDs, and RF anomalies
- correlate wireless alerts with wired-network evidence
- isolate rogue access points through deauthentication and switch-port shutdown
- prevent Evil Twin attacks with `802.1X` and `EAP-TLS`

## References

### WIDS and WIPS Implementation

- [CISA - A Guide to Securing Networks for Wi-Fi](https://www.cisa.gov/sites/default/files/publications/A_Guide_to_Securing_Networks_for_Wi-Fi.pdf)
- [NiSEcure - What Is a Wireless Intrusion Detection System (WIDS)](https://nilesecure.com/network-security/what-is-a-wireless-intrusion-detection-system-wids-2)

### RF Anomaly Monitoring

- [MITRE ATT&CK - Detection Strategy DET0379](https://attack.mitre.org/detectionstrategies/DET0379/)

### Wired-Network Correlation Using MAC, DHCP, and ARP

- [Aruba Networks - Rogue AP Detection Guide](https://higherlogicdownload.s3.amazonaws.com/HPE/MigratedAssets/PDFRogueAPGuide.pdf)

### Automated Mitigation with Deauthentication and Two-Way Spoofing

- [Cisco Meraki - Air Marshal Monitoring and Reporting](https://documentation.meraki.com/Wireless/Operate_and_Maintain/User_Guides/Monitoring_and_Reporting/Air_Marshal)
- [dot11ap - Wireless Intrusion Protection System (WIPS)](https://dot11ap.wordpress.com/wireless-intrusion-protection-system-wips/)

### Switch Port Suppression Through SNMP

- [dot11ap - Wireless Intrusion Protection System (WIPS)](https://dot11ap.wordpress.com/wireless-intrusion-protection-system-wips/)

### 802.1X and EAP-TLS as Preventive Control

- [SecureW2 - What Is an Evil Twin Attack in Wi-Fi and How Can I Protect Against It](https://securew2.com/blog/what-is-an-evil-twin-attack-in-wi-fi-and-how-can-i-protect-against-it)
- [Portnox - Understanding 802.1X Protocol for Network Access Control](https://www.portnox.com/blog/network-access-control/understanding-802-1x-protocol-network-access-control/)
