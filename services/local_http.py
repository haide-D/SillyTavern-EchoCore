"""Keep local model traffic off environment/system HTTP proxies.

Do not resolve public names here: VPN fake-IP DNS answers must not turn public
services into direct connections. Public model endpoints retain proxy support.
"""
from ipaddress import ip_address, ip_network
from urllib.parse import urlsplit

_LOCAL_NETWORKS = tuple(map(ip_network, (
    '127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
    '169.254.0.0/16', '::1/128', 'fc00::/7', 'fe80::/10',
)))


def model_trust_env(url: str) -> bool:
    """False only for literal loopback/LAN addresses and local hostnames."""
    host = (urlsplit(url).hostname or '').lower().rstrip('.')
    if host == 'localhost' or host.endswith(('.localhost', '.local', '.lan')):
        return False
    try:
        address = ip_address(host)
        if getattr(address, 'ipv4_mapped', None):
            address = address.ipv4_mapped
        return not (address.is_unspecified or any(address in network for network in _LOCAL_NETWORKS))
    except ValueError:
        return True
