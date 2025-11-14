"""
IPFS Storage - Decentralized file storage using IPFS
Supports: IPFS (InterPlanetary File System), Filecoin integration
"""
import logging
import json
from pathlib import Path
from typing import Optional, Dict, Any, List

codex/test-and-fix-all-databases
try:  # pragma: no cover - optional dependency guard
    import requests
except ModuleNotFoundError:  # pragma: no cover - handled gracefully at runtime

# ``requests`` might be unavailable in the minimal test environment.  Importing
# it lazily keeps the module importable when the dependency is missing.
try:  # pragma: no cover - the real network code isn't exercised in tests
    import requests  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - triggered during tests
main
    requests = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)


class IPFSStorage:
    """Manage files on IPFS (decentralized storage)."""

    def __init__(self, ipfs_api_url: str = "http://localhost:5001", enable_filecoin: bool = False):
        self.ipfs_api_url = ipfs_api_url
        self.enable_filecoin = enable_filecoin
        self.available = self._check_connection()

    def _check_connection(self) -> bool:
        """Check if IPFS daemon is running."""
        if requests is None:
codex/test-and-fix-all-databases
            logger.warning("requests library is not installed; IPFS support disabled")
            return False

            logger.debug("requests is not installed; skipping IPFS connection check")
            return False

main
        try:
            response = requests.get(f"{self.ipfs_api_url}/api/v0/version", timeout=2)
            if response.status_code == 200:
                version_info = response.json()
                logger.info(f"Connected to IPFS version: {version_info.get('Version')}")
                return True
        except Exception as e:
            logger.warning(f"IPFS daemon not available: {e}")
        return False

    async def upload_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """
        Upload file to IPFS.

        Returns:
            Dict with 'cid' (Content Identifier) and metadata
        """
        if not self.available or requests is None:
            logger.error("IPFS daemon not available")
            return None
        if requests is None:
            logger.error("requests library is required for IPFS uploads")
            return None

        try:
            with open(file_path, 'rb') as f:
                files = {'file': f}
                response = requests.post(
                    f"{self.ipfs_api_url}/api/v0/add",
                    files=files,
                    params={'wrap-with-directory': 'false'}
                )

            if response.status_code == 200:
                result = response.json()
                cid = result.get('Hash')
                size = result.get('Size', 0)

                logger.info(f"Uploaded to IPFS: {file_path.name} -> {cid}")

                # Pin the file to ensure it stays on the network
                await self.pin_file(cid)

                # Optionally store on Filecoin for long-term archival
                filecoin_deal_cid = None
                if self.enable_filecoin:
                    filecoin_deal_cid = await self.store_on_filecoin(cid)

                return {
                    'cid': cid,
                    'size': size,
                    'file_name': file_path.name,
                    'ipfs_gateway_url': f"https://ipfs.io/ipfs/{cid}",
                    'filecoin_deal_cid': filecoin_deal_cid
                }
        except Exception as e:
            logger.error(f"IPFS upload failed: {e}")
            return None

    async def download_file(self, cid: str, output_path: Optional[Path] = None) -> Optional[Path]:
        """
        Download file from IPFS using CID.
        """
        if not self.available or requests is None:
            logger.error("IPFS daemon not available")
            return None
        if requests is None:
            logger.error("requests library is required for IPFS downloads")
            return None

        try:
            response = requests.post(
                f"{self.ipfs_api_url}/api/v0/cat",
                params={'arg': cid},
                stream=True
            )

            if response.status_code == 200:
                if not output_path:
                    output_path = Path(f"/tmp/{cid}")

                output_path.parent.mkdir(parents=True, exist_ok=True)

                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)

                logger.info(f"Downloaded from IPFS: {cid} -> {output_path}")
                return output_path
        except Exception as e:
            logger.error(f"IPFS download failed: {e}")
            return None

    async def pin_file(self, cid: str) -> bool:
        """
        Pin file to local IPFS node (prevent garbage collection).
        """
        if requests is None:
            logger.error("requests is not installed; cannot pin file")
            return False

        try:
            if requests is None:
                logger.error("requests library is required to pin files")
                return False
            response = requests.post(
                f"{self.ipfs_api_url}/api/v0/pin/add",
                params={'arg': cid}
            )
            if response.status_code == 200:
                logger.info(f"Pinned to IPFS: {cid}")
                return True
        except Exception as e:
            logger.error(f"IPFS pin failed: {e}")
        return False

    async def unpin_file(self, cid: str) -> bool:
        """
        Unpin file from local IPFS node.
        """
        if requests is None:
codex/test-and-fix-all-databases
            logger.error("requests library is required to unpin files")
            return False

            logger.error("requests is not installed; cannot unpin file")
            return False

main
        try:
            response = requests.post(
                f"{self.ipfs_api_url}/api/v0/pin/rm",
                params={'arg': cid}
            )
            if response.status_code == 200:
                logger.info(f"Unpinned from IPFS: {cid}")
                return True
        except Exception as e:
            logger.error(f"IPFS unpin failed: {e}")
        return False

    async def get_file_info(self, cid: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata about a file stored on IPFS.
        """
        if requests is None:
codex/test-and-fix-all-databases
            logger.error("requests library is required to query IPFS metadata")
            return None

            logger.error("requests is not installed; cannot fetch file info")
            return None

main
        try:
            response = requests.post(
                f"{self.ipfs_api_url}/api/v0/object/stat",
                params={'arg': cid}
            )
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.error(f"Failed to get IPFS file info: {e}")
        return None

    async def list_pins(self) -> List[str]:
        """
        List all pinned CIDs on local node.
        """
        if requests is None:
            logger.error("requests is not installed; cannot list pins")
            return []

        try:
            if requests is None:
                logger.error("requests library is required to list IPFS pins")
                return []
            response = requests.post(f"{self.ipfs_api_url}/api/v0/pin/ls")
            if response.status_code == 200:
                data = response.json()
                return list(data.get('Keys', {}).keys())
        except Exception as e:
            logger.error(f"Failed to list pins: {e}")
        return []

    async def store_on_filecoin(self, cid: str) -> Optional[str]:
        """
        Store file on Filecoin network for long-term archival.

        This is a placeholder for Filecoin integration.
        In production, you would use:
        - Lotus client API
        - Powergate
        - Web3.Storage
        - Estuary

        Returns:
            Deal CID if successful
        """
        logger.warning("Filecoin integration not implemented. Use Powergate/Lotus API.")

        # Placeholder for future implementation
        # In real implementation:
        # 1. Connect to Lotus/Powergate
        # 2. Create storage deal
        # 3. Wait for deal confirmation
        # 4. Return deal CID

        return None

    def get_ipfs_url(self, cid: str, gateway: str = "ipfs.io") -> str:
        """
        Get public gateway URL for a CID.

        Available gateways:
        - ipfs.io (official)
        - cloudflare-ipfs.com (fast)
        - dweb.link (dweb standard)
        """
        return f"https://{gateway}/ipfs/{cid}"

    async def upload_folder(self, folder_path: Path) -> Optional[Dict[str, Any]]:
        """
        Upload entire folder to IPFS.

        Returns dict with root CID and file mapping.
        """
        if not self.available:
            return None

        try:
            # Build file list
            files = []
            for file in folder_path.rglob('*'):
                if file.is_file():
                    relative_path = file.relative_to(folder_path)
                    files.append(('file', (str(relative_path), open(file, 'rb'))))

            response = requests.post(
                f"{self.ipfs_api_url}/api/v0/add",
                files=files,
                params={
                    'recursive': 'true',
                    'wrap-with-directory': 'true'
                }
            )

            if response.status_code == 200:
                # Parse response (multiple JSON objects)
                results = [json.loads(line) for line in response.text.strip().split('\n')]
                root_cid = results[-1]['Hash']  # Last entry is the root directory

                logger.info(f"Uploaded folder to IPFS: {folder_path} -> {root_cid}")

                await self.pin_file(root_cid)

                return {
                    'root_cid': root_cid,
                    'files': results[:-1],  # All files except root
                    'ipfs_gateway_url': f"https://ipfs.io/ipfs/{root_cid}"
                }
        except Exception as e:
            logger.error(f"IPFS folder upload failed: {e}")
        return None


# Installation instructions:
# 1. Install IPFS Desktop: https://docs.ipfs.tech/install/ipfs-desktop/
# 2. Or install IPFS CLI: https://docs.ipfs.tech/install/command-line/
# 3. Start IPFS daemon: ipfs daemon
# 4. IPFS API will be available at http://localhost:5001
#
# For Filecoin integration:
# 1. Install Lotus: https://lotus.filecoin.io/
# 2. Or use Powergate: https://github.com/textileio/powergate
# 3. Or use Web3.Storage: https://web3.storage/
