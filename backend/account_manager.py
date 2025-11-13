"""
Multi-Account Manager - Support for multiple Telegram accounts
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class Account(BaseModel):
    """Single Telegram account configuration."""
    id: str
    name: str
    api_id: int
    api_hash: str
    session: str
    phone: Optional[str] = None
    is_active: bool = False


class AccountManager:
    """Manage multiple Telegram accounts."""

    def __init__(self, accounts_file: Path):
        self.accounts_file = accounts_file
        self.accounts: Dict[str, Account] = {}
        self.active_account_id: Optional[str] = None
        self._load_accounts()

    def _load_accounts(self):
        """Load accounts from file."""
        if self.accounts_file.exists():
            try:
                data = json.loads(self.accounts_file.read_text("utf-8"))
                for account_data in data.get("accounts", []):
                    account = Account(**account_data)
                    self.accounts[account.id] = account
                    if account.is_active:
                        self.active_account_id = account.id
                logger.info(f"Loaded {len(self.accounts)} accounts")
            except Exception as e:
                logger.error(f"Failed to load accounts: {e}")
                self.accounts = {}
        else:
            logger.info("No accounts file found, starting fresh")

    def _save_accounts(self):
        """Save accounts to file."""
        try:
            data = {
                "accounts": [
                    account.model_dump() for account in self.accounts.values()
                ],
                "active_account_id": self.active_account_id
            }
            self.accounts_file.write_text(
                json.dumps(data, indent=2),
                encoding="utf-8"
            )
            logger.info(f"Saved {len(self.accounts)} accounts")
        except Exception as e:
            logger.error(f"Failed to save accounts: {e}")

    def add_account(
        self,
        account_id: str,
        name: str,
        api_id: int,
        api_hash: str,
        phone: Optional[str] = None
    ) -> Account:
        """Add a new account."""
        # Create unique session file for this account
        session = f"tg_media_{account_id}"

        account = Account(
            id=account_id,
            name=name,
            api_id=api_id,
            api_hash=api_hash,
            session=session,
            phone=phone,
            is_active=len(self.accounts) == 0  # First account is active by default
        )

        self.accounts[account_id] = account

        if account.is_active:
            self.active_account_id = account_id

        self._save_accounts()
        logger.info(f"Added account: {name} ({account_id})")
        return account

    def remove_account(self, account_id: str) -> bool:
        """Remove an account."""
        if account_id not in self.accounts:
            return False

        # Remove session file if exists
        session_file = Path(f"{self.accounts[account_id].session}.session")
        if session_file.exists():
            session_file.unlink()

        del self.accounts[account_id]

        # If this was the active account, switch to another
        if self.active_account_id == account_id:
            if self.accounts:
                self.active_account_id = next(iter(self.accounts.keys()))
                self.accounts[self.active_account_id].is_active = True
            else:
                self.active_account_id = None

        self._save_accounts()
        logger.info(f"Removed account: {account_id}")
        return True

    def switch_account(self, account_id: str) -> bool:
        """Switch to a different account."""
        if account_id not in self.accounts:
            return False

        # Deactivate current account
        if self.active_account_id:
            self.accounts[self.active_account_id].is_active = False

        # Activate new account
        self.accounts[account_id].is_active = True
        self.active_account_id = account_id

        self._save_accounts()
        logger.info(f"Switched to account: {self.accounts[account_id].name}")
        return True

    def get_active_account(self) -> Optional[Account]:
        """Get the currently active account."""
        if self.active_account_id and self.active_account_id in self.accounts:
            return self.accounts[self.active_account_id]
        return None

    def get_account(self, account_id: str) -> Optional[Account]:
        """Get a specific account by ID."""
        return self.accounts.get(account_id)

    def list_accounts(self) -> List[Account]:
        """List all accounts."""
        return list(self.accounts.values())

    def get_account_credentials(self, account_id: Optional[str] = None) -> Dict:
        """Get credentials for an account (active if not specified)."""
        account_id = account_id or self.active_account_id
        if not account_id or account_id not in self.accounts:
            return {}

        account = self.accounts[account_id]
        return {
            "api_id": account.api_id,
            "api_hash": account.api_hash,
            "session": account.session,
            "phone": account.phone
        }
