import { useState, useEffect } from 'react';
import { toDate } from '@/lib/dateUtils';
import { 
  addInsurancePolicy, 
  watchInsurancePolicies, 
  updateInsurancePolicy, 
  removeInsurancePolicy,
  addInsuranceClaim,
  watchInsuranceClaims,
  updateInsuranceClaim,
  removeInsuranceClaim,
  calculateMonthlyInsuranceCosts,
  getDaysUntilExpiry,
  getExpiryStatus,
  type InsurancePolicy, 
  type InsuranceClaim 
} from '@/lib/insurance';

export function useInsurance(carId?: string) {
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>([]);
  const [insuranceClaims, setInsuranceClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribePolicies = watchInsurancePolicies((policies) => {
      setInsurancePolicies(policies);
      setLoading(false);
      setError(null);
    });

    const unsubscribeClaims = watchInsuranceClaims((claims) => {
      setInsuranceClaims(claims);
    });
    
    return () => {
      unsubscribePolicies();
      unsubscribeClaims();
    };
  }, []);

  const addPolicy = async (policyData: any) => {
    try {
      setError(null);
      const policyId = await addInsurancePolicy(policyData);
      return policyId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保険契約の追加に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const updatePolicy = async (policyId: string, policyData: Partial<InsurancePolicy>) => {
    try {
      setError(null);
      await updateInsurancePolicy(policyId, policyData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保険契約の更新に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const deletePolicy = async (policyId: string) => {
    try {
      setError(null);
      await removeInsurancePolicy(policyId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保険契約の削除に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const addClaim = async (claimData: any) => {
    try {
      setError(null);
      const claimId = await addInsuranceClaim(claimData);
      return claimId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保険請求の追加に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const updateClaim = async (claimId: string, claimData: Partial<InsuranceClaim>) => {
    try {
      setError(null);
      await updateInsuranceClaim(claimId, claimData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保険請求の更新に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteClaim = async (claimId: string) => {
    try {
      setError(null);
      await removeInsuranceClaim(claimId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保険請求の削除に失敗しました';
      setError(errorMessage);
      throw err;
    }
  };

  const getMonthlyCosts = () => {
    return calculateMonthlyInsuranceCosts(insurancePolicies);
  };

  const getExpiryInfo = (policy: InsurancePolicy) => {
    const endDate = toDate(policy.endDate);
    if (!endDate) return { daysUntilExpiry: 0, status: 'expired' as const };
    return {
      daysUntilExpiry: getDaysUntilExpiry(endDate),
      status: getExpiryStatus(endDate),
    };
  };

  return {
    insurancePolicies,
    insuranceClaims,
    loading,
    error,
    addPolicy,
    updatePolicy,
    deletePolicy,
    addClaim,
    updateClaim,
    deleteClaim,
    getMonthlyCosts,
    getExpiryInfo,
  };
}
