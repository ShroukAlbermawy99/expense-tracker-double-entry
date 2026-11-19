import { AccountCategory } from "@core/interfaces/account-model";
export interface ChipOption {
  value: Record<AccountCategory, string[]>;
  removable: boolean;
}
