import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminDeclarationDetail,
  updateDependents,
  updateInsurance,
  updateHousing,
  updateSalary,
  overrideResult,
  DependentUpsert,
  InsuranceUpsert,
} from '../../api/adminEdit'
import { approveDeclaration, rejectDeclaration } from '../../api/declarations'
import { StatusBadge } from '../../components/StatusBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'

type Tab = 'basic' | 'dependents' | 'insurance' | 'housing' | 'result'

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: 12,
  padding: '1.5rem',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  marginBottom: '1.25rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
}

const btnPrimary: React.CSSProperties = {
  backgroundColor: '#1a56db',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const RELATION_TYPES = ['spouse', 'child', 'parent', 'grandparent', 'sibling', 'other']
const RELATION_LABELS: Record<string, string> = {
  spouse: '配偶者', child: '子', parent: '父母', grandparent: '祖父母', sibling: '兄弟姉妹', other: 'その他'
}
const INSURANCE_TYPES = [
  'life_new', 'life_old', 'annuity_new', 'annuity_old',
  'nursing_care', 'earthquake', 'social', 'small_business'
]
const INSURANCE_LABELS: Record<string, string> = {
  life_new: '一般生命（新）', life_old: '一般生命（旧）',
  annuity_new: '個人年金（新）', annuity_old: '個人年金（旧）',
  nursing_care: '介護医療', earthquake: '地震保険',
  social: '社会保険', small_business: '小規模企業共済等',
}

export const DeclarationEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const declarationId = parseInt(id || '0', 10)
  const [activeTab, setActiveTab] = useState<Tab>('basic')
  const [successMsg, setSuccessMsg] = useState('')

  // Salary form state
  const [salaryForm, setSalaryForm] = useState({ total_salary: '', social_insurance_deduction: '', withheld_tax_ytd: '' })
  const [salaryEditing, setSalaryEditing] = useState(false)

  // Dependents state
  const [depsEditing, setDepsEditing] = useState(false)
  const [depsForm, setDepsForm] = useState<DependentUpsert[]>([])

  // Insurance state
  const [insEditing, setInsEditing] = useState(false)
  const [insForm, setInsForm] = useState<InsuranceUpsert[]>([])

  // Housing state
  const [housingEditing, setHousingEditing] = useState(false)
  const [housingForm, setHousingForm] = useState({
    residence_start_date: '', deduction_type: 'special',
    loan_balance_1: '', loan_balance_2: '', deduction_amount: '',
  })

  // Result override state
  const [resultEditing, setResultEditing] = useState(false)
  const [resultForm, setResultForm] = useState({ final_tax: '', withheld_tax: '', refund_or_collection: '' })

  // Approve/reject
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data: decl, isLoading } = useQuery({
    queryKey: ['admin-decl-detail', declarationId],
    queryFn: () => getAdminDeclarationDetail(declarationId),
    enabled: !!declarationId,
  })

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  const salaryMutation = useMutation({
    mutationFn: () => updateSalary(declarationId, {
      total_salary: Number(salaryForm.total_salary),
      social_insurance_deduction: Number(salaryForm.social_insurance_deduction),
      withheld_tax_ytd: Number(salaryForm.withheld_tax_ytd),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-decl-detail', declarationId] })
      setSalaryEditing(false)
      showSuccess('給与データを保存しました')
    },
  })

  const depsMutation = useMutation({
    mutationFn: () => updateDependents(declarationId, depsForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-decl-detail', declarationId] })
      setDepsEditing(false)
      showSuccess('扶養家族情報を保存しました')
    },
  })

  const insMutation = useMutation({
    mutationFn: () => updateInsurance(declarationId, insForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-decl-detail', declarationId] })
      setInsEditing(false)
      showSuccess('保険料控除情報を保存しました')
    },
  })

  const housingMutation = useMutation({
    mutationFn: () => updateHousing(declarationId, {
      residence_start_date: housingForm.residence_start_date || undefined,
      deduction_type: housingForm.deduction_type,
      loan_balance_1: Number(housingForm.loan_balance_1) || 0,
      loan_balance_2: Number(housingForm.loan_balance_2) || 0,
      deduction_amount: Number(housingForm.deduction_amount) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-decl-detail', declarationId] })
      setHousingEditing(false)
      showSuccess('住宅ローン控除情報を保存しました')
    },
  })

  const resultMutation = useMutation({
    mutationFn: () => overrideResult((decl?.result as Record<string, unknown>)?.id as number, {
      final_tax: Number(resultForm.final_tax),
      withheld_tax: Number(resultForm.withheld_tax),
      refund_or_collection: Number(resultForm.refund_or_collection),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-decl-detail', declarationId] })
      setResultEditing(false)
      showSuccess('計算結果を上書きしました')
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => approveDeclaration(declarationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-decl-detail', declarationId] })
      showSuccess('承認しました')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () => rejectDeclaration(declarationId, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-decl-detail', declarationId] })
      setShowRejectForm(false)
      setRejectReason('')
      showSuccess('差し戻しました')
    },
  })

  if (isLoading) return <LoadingSpinner fullPage />
  if (!decl) return <div style={{ padding: '2rem', color: '#dc2626' }}>申告書が見つかりません</div>

  const canReview = ['submitted', 'under_review'].includes(decl.status)
  const tabs: { key: Tab; label: string }[] = [
    { key: 'basic', label: '基本情報・給与' },
    { key: 'dependents', label: `扶養家族 (${decl.dependents.length})` },
    { key: 'insurance', label: `保険料控除 (${decl.insurance_deductions.length})` },
    { key: 'housing', label: '住宅ローン' },
    { key: 'result', label: '計算結果' },
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/admin/declarations')}
          style={{ background: 'none', border: 'none', color: '#1a56db', cursor: 'pointer', fontSize: 14 }}>
          ← 一覧に戻る
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', margin: 0 }}>
          申告書編集（管理者代理入力）
        </h2>
        <StatusBadge status={decl.status} />
      </div>

      {successMsg && (
        <div style={{ backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 16px', color: '#065f46', fontSize: 13, fontWeight: 600, marginBottom: '1rem' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Employee info */}
      <div style={{ ...cardStyle, padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem', fontSize: 13 }}>
          <span><span style={{ color: '#9ca3af' }}>社員番号: </span>{decl.employee_code}</span>
          <span><span style={{ color: '#9ca3af' }}>氏名: </span>{decl.employee_last_name} {decl.employee_first_name}</span>
          <span><span style={{ color: '#9ca3af' }}>部署: </span>{decl.department_name}</span>
          <span><span style={{ color: '#9ca3af' }}>年度: </span>{decl.fiscal_year}年度</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', borderBottom: '2px solid #e2e8f0' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              color: activeTab === t.key ? '#1a56db' : '#6b7280',
              borderBottom: activeTab === t.key ? '2px solid #1a56db' : '2px solid transparent',
              marginBottom: -2,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Basic / Salary */}
      {activeTab === 'basic' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', margin: 0 }}>給与データ</h3>
            {!salaryEditing && (
              <button onClick={() => {
                setSalaryForm({
                  total_salary: decl.total_salary || '',
                  social_insurance_deduction: decl.social_insurance_deduction || '',
                  withheld_tax_ytd: decl.withheld_tax_ytd || '',
                })
                setSalaryEditing(true)
              }} style={btnPrimary}>編集</button>
            )}
          </div>
          {salaryEditing ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              {[
                { key: 'total_salary', label: '総支給額（年間）' },
                { key: 'social_insurance_deduction', label: '社会保険料控除' },
                { key: 'withheld_tax_ytd', label: '源泉徴収税額（累計）' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type="number" value={salaryForm[key as keyof typeof salaryForm]}
                    onChange={(e) => setSalaryForm(f => ({ ...f, [key]: e.target.value }))}
                    style={inputStyle} placeholder="0" />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => salaryMutation.mutateAsync()} disabled={salaryMutation.isPending} style={btnPrimary}>保存</button>
                <button onClick={() => setSalaryEditing(false)} style={{ ...btnPrimary, backgroundColor: '#6b7280' }}>キャンセル</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: 13 }}>
              {[
                { label: '総支給額', value: decl.total_salary },
                { label: '社会保険料控除', value: decl.social_insurance_deduction },
                { label: '源泉徴収税額', value: decl.withheld_tax_ytd },
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: '#f8fafc', borderRadius: 8, padding: '0.75rem' }}>
                  <p style={{ color: '#9ca3af', fontSize: 11, margin: '0 0 4px' }}>{label}</p>
                  <p style={{ fontWeight: 700, color: '#1a3a5c', margin: 0, fontSize: 16 }}>
                    {value ? `¥${Number(value).toLocaleString()}` : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {canReview && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>審査アクション</h3>
              {showRejectForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    rows={3} placeholder="差し戻し理由を入力してください"
                    style={{ ...inputStyle, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => rejectMutation.mutateAsync()} disabled={!rejectReason.trim()}
                      style={{ ...btnPrimary, backgroundColor: '#dc2626' }}>差し戻す</button>
                    <button onClick={() => setShowRejectForm(false)} style={{ ...btnPrimary, backgroundColor: '#6b7280' }}>キャンセル</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => { if (confirm('承認しますか？')) approveMutation.mutateAsync() }}
                    style={{ ...btnPrimary, backgroundColor: '#059669' }}>✓ 承認する</button>
                  <button onClick={() => setShowRejectForm(true)}
                    style={{ ...btnPrimary, backgroundColor: 'white', color: '#dc2626', border: '1px solid #fca5a5' }}>✗ 差し戻す</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Dependents */}
      {activeTab === 'dependents' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', margin: 0 }}>扶養家族</h3>
            {!depsEditing ? (
              <button onClick={() => {
                setDepsForm(decl.dependents.map((d) => ({
                  id: d.id as number,
                  relation_type: d.relation_type as string,
                  last_name: d.last_name as string,
                  first_name: d.first_name as string,
                  birth_date: d.birth_date as string | undefined,
                  annual_income: Number(d.annual_income) || 0,
                  disability_type: d.disability_type as string || 'none',
                  is_living_together: d.is_living_together as boolean,
                })))
                setDepsEditing(true)
              }} style={btnPrimary}>編集</button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setDepsForm(f => [...f, {
                  relation_type: 'child', last_name: '', first_name: '',
                  annual_income: 0, disability_type: 'none', is_living_together: true,
                }])} style={{ ...btnPrimary, backgroundColor: '#059669' }}>+ 追加</button>
                <button onClick={() => depsMutation.mutateAsync()} disabled={depsMutation.isPending} style={btnPrimary}>保存</button>
                <button onClick={() => setDepsEditing(false)} style={{ ...btnPrimary, backgroundColor: '#6b7280' }}>キャンセル</button>
              </div>
            )}
          </div>

          {depsEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {depsForm.map((dep, idx) => (
                <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>扶養家族 {idx + 1}</span>
                    <button onClick={() => setDepsForm(f => f.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>削除</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>続柄</label>
                      <select value={dep.relation_type}
                        onChange={(e) => setDepsForm(f => f.map((d, i) => i === idx ? { ...d, relation_type: e.target.value } : d))}
                        style={inputStyle}>
                        {RELATION_TYPES.map(r => <option key={r} value={r}>{RELATION_LABELS[r]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>姓</label>
                      <input value={dep.last_name}
                        onChange={(e) => setDepsForm(f => f.map((d, i) => i === idx ? { ...d, last_name: e.target.value } : d))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>名</label>
                      <input value={dep.first_name}
                        onChange={(e) => setDepsForm(f => f.map((d, i) => i === idx ? { ...d, first_name: e.target.value } : d))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>生年月日</label>
                      <input type="date" value={dep.birth_date || ''}
                        onChange={(e) => setDepsForm(f => f.map((d, i) => i === idx ? { ...d, birth_date: e.target.value } : d))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>年間所得</label>
                      <input type="number" value={dep.annual_income}
                        onChange={(e) => setDepsForm(f => f.map((d, i) => i === idx ? { ...d, annual_income: Number(e.target.value) } : d))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>同居</label>
                      <select value={dep.is_living_together ? 'true' : 'false'}
                        onChange={(e) => setDepsForm(f => f.map((d, i) => i === idx ? { ...d, is_living_together: e.target.value === 'true' } : d))}
                        style={inputStyle}>
                        <option value="true">同居</option>
                        <option value="false">別居</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              {depsForm.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>扶養家族なし（+ 追加ボタンで追加できます）</p>}
            </div>
          ) : (
            decl.dependents.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>登録なし</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    {['続柄', '氏名', '生年月日', '年間所得', '同居'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {decl.dependents.map((d, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{RELATION_LABELS[d.relation_type as string] || d.relation_type as string}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{d.last_name as string} {d.first_name as string}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{d.birth_date as string || '—'}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>¥{Number(d.annual_income).toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{d.is_living_together ? '○' : '×'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}

      {/* Tab: Insurance */}
      {activeTab === 'insurance' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', margin: 0 }}>保険料控除</h3>
            {!insEditing ? (
              <button onClick={() => {
                setInsForm(decl.insurance_deductions.map(i => ({
                  id: i.id as number,
                  insurance_type: i.insurance_type as string,
                  insurance_company: i.insurance_company as string || '',
                  policy_name: i.policy_name as string || '',
                  insured_person: i.insured_person as string || '',
                  payment_amount: Number(i.payment_amount) || 0,
                  deduction_amount: Number(i.deduction_amount) || 0,
                })))
                setInsEditing(true)
              }} style={btnPrimary}>編集</button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setInsForm(f => [...f, {
                  insurance_type: 'life_new', insurance_company: '', policy_name: '',
                  insured_person: '', payment_amount: 0, deduction_amount: 0,
                }])} style={{ ...btnPrimary, backgroundColor: '#059669' }}>+ 追加</button>
                <button onClick={() => insMutation.mutateAsync()} disabled={insMutation.isPending} style={btnPrimary}>保存</button>
                <button onClick={() => setInsEditing(false)} style={{ ...btnPrimary, backgroundColor: '#6b7280' }}>キャンセル</button>
              </div>
            )}
          </div>

          {insEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {insForm.map((ins, idx) => (
                <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>保険 {idx + 1}</span>
                    <button onClick={() => setInsForm(f => f.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>削除</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>種別</label>
                      <select value={ins.insurance_type}
                        onChange={(e) => setInsForm(f => f.map((d, i) => i === idx ? { ...d, insurance_type: e.target.value } : d))}
                        style={inputStyle}>
                        {INSURANCE_TYPES.map(t => <option key={t} value={t}>{INSURANCE_LABELS[t]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>保険会社</label>
                      <input value={ins.insurance_company}
                        onChange={(e) => setInsForm(f => f.map((d, i) => i === idx ? { ...d, insurance_company: e.target.value } : d))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>証券名・保険名</label>
                      <input value={ins.policy_name}
                        onChange={(e) => setInsForm(f => f.map((d, i) => i === idx ? { ...d, policy_name: e.target.value } : d))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>支払保険料</label>
                      <input type="number" value={ins.payment_amount}
                        onChange={(e) => setInsForm(f => f.map((d, i) => i === idx ? { ...d, payment_amount: Number(e.target.value) } : d))}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 2 }}>控除額</label>
                      <input type="number" value={ins.deduction_amount}
                        onChange={(e) => setInsForm(f => f.map((d, i) => i === idx ? { ...d, deduction_amount: Number(e.target.value) } : d))}
                        style={inputStyle} />
                    </div>
                  </div>
                </div>
              ))}
              {insForm.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>保険料控除なし</p>}
            </div>
          ) : (
            decl.insurance_deductions.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>登録なし</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    {['種別', '保険会社', '支払保険料', '控除額'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {decl.insurance_deductions.map((ins, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{INSURANCE_LABELS[ins.insurance_type as string] || ins.insurance_type as string}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{ins.insurance_company as string}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>¥{Number(ins.payment_amount).toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#059669', fontWeight: 600 }}>¥{Number(ins.deduction_amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}

      {/* Tab: Housing */}
      {activeTab === 'housing' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', margin: 0 }}>住宅ローン控除</h3>
            {!housingEditing ? (
              <button onClick={() => {
                const h = decl.housing_deduction
                setHousingForm({
                  residence_start_date: h?.residence_start_date as string || '',
                  deduction_type: h?.deduction_type as string || 'special',
                  loan_balance_1: h?.loan_balance_1 as string || '',
                  loan_balance_2: h?.loan_balance_2 as string || '',
                  deduction_amount: h?.deduction_amount as string || '',
                })
                setHousingEditing(true)
              }} style={btnPrimary}>{decl.housing_deduction ? '編集' : '新規追加'}</button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => housingMutation.mutateAsync()} disabled={housingMutation.isPending} style={btnPrimary}>保存</button>
                <button onClick={() => setHousingEditing(false)} style={{ ...btnPrimary, backgroundColor: '#6b7280' }}>キャンセル</button>
              </div>
            )}
          </div>

          {housingEditing ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { key: 'residence_start_date', label: '居住開始日', type: 'date' },
                { key: 'deduction_type', label: '控除区分', type: 'text' },
                { key: 'loan_balance_1', label: 'ローン残高①', type: 'number' },
                { key: 'loan_balance_2', label: 'ローン残高②', type: 'number' },
                { key: 'deduction_amount', label: '控除額', type: 'number' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type={type} value={housingForm[key as keyof typeof housingForm]}
                    onChange={(e) => setHousingForm(f => ({ ...f, [key]: e.target.value }))}
                    style={inputStyle} />
                </div>
              ))}
            </div>
          ) : decl.housing_deduction ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: 13 }}>
              {[
                { label: '居住開始日', value: decl.housing_deduction.residence_start_date as string },
                { label: '控除区分', value: decl.housing_deduction.deduction_type as string },
                { label: 'ローン残高①', value: `¥${Number(decl.housing_deduction.loan_balance_1).toLocaleString()}` },
                { label: 'ローン残高②', value: `¥${Number(decl.housing_deduction.loan_balance_2).toLocaleString()}` },
                { label: '控除額', value: `¥${Number(decl.housing_deduction.deduction_amount).toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: '#f8fafc', borderRadius: 8, padding: '0.75rem' }}>
                  <p style={{ color: '#9ca3af', fontSize: 11, margin: '0 0 4px' }}>{label}</p>
                  <p style={{ fontWeight: 600, color: '#1a3a5c', margin: 0 }}>{value || '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: 13 }}>住宅ローン控除の登録なし</p>
          )}
        </div>
      )}

      {/* Tab: Result */}
      {activeTab === 'result' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', margin: 0 }}>計算結果</h3>
            {decl.result && !resultEditing && (
              <button onClick={() => {
                const r = decl.result as Record<string, unknown>
                setResultForm({
                  final_tax: r.final_tax as string || '',
                  withheld_tax: r.withheld_tax as string || '',
                  refund_or_collection: r.refund_or_collection as string || '',
                })
                setResultEditing(true)
              }} style={{ ...btnPrimary, backgroundColor: '#f59e0b' }}>手動上書き</button>
            )}
            {resultEditing && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => resultMutation.mutateAsync()} disabled={resultMutation.isPending}
                  style={{ ...btnPrimary, backgroundColor: '#f59e0b' }}>上書き保存</button>
                <button onClick={() => setResultEditing(false)} style={{ ...btnPrimary, backgroundColor: '#6b7280' }}>キャンセル</button>
              </div>
            )}
          </div>

          {!decl.result ? (
            <p style={{ color: '#9ca3af', fontSize: 13 }}>計算結果なし（計算実行後に表示されます）</p>
          ) : resultEditing ? (
            <div>
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: '1rem' }}>
                ⚠️ 計算結果を手動で上書きします。上書き後は再計算で元の値に戻ります。
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                {[
                  { key: 'final_tax', label: '年税額' },
                  { key: 'withheld_tax', label: '源泉徴収税額' },
                  { key: 'refund_or_collection', label: '還付(+)/追徴(-)額' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
                    <input type="number" value={resultForm[key as keyof typeof resultForm]}
                      onChange={(e) => setResultForm(f => ({ ...f, [key]: e.target.value }))}
                      style={inputStyle} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            (() => {
              const r = decl.result as Record<string, unknown>
              const refund = Number(r.refund_or_collection)
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    {[
                      { label: '総支給額', value: r.total_salary },
                      { label: '給与所得金額', value: r.salary_income },
                      { label: '所得控除合計', value: r.total_deductions },
                      { label: '課税所得', value: r.taxable_income },
                      { label: '算出税額', value: r.calculated_tax },
                      { label: '住宅控除（税額）', value: r.special_tax_credit },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ backgroundColor: '#f8fafc', borderRadius: 8, padding: '0.75rem' }}>
                        <p style={{ color: '#9ca3af', fontSize: 11, margin: '0 0 4px' }}>{label}</p>
                        <p style={{ fontWeight: 600, color: '#1a3a5c', margin: 0, fontSize: 14 }}>¥{Number(value).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { label: '年税額', value: r.final_tax, color: '#1a3a5c' },
                      { label: '源泉徴収税額', value: r.withheld_tax, color: '#1a3a5c' },
                      { label: refund >= 0 ? '還付額' : '追徴額', value: Math.abs(refund), color: refund >= 0 ? '#059669' : '#dc2626' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
                        <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 4px' }}>{label}</p>
                        <p style={{ fontWeight: 700, color, margin: 0, fontSize: 20 }}>¥{Number(value).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()
          )}
        </div>
      )}
    </div>
  )
}
