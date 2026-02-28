"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export interface Contact {
  id: string
  name: string
  clientName: string
  relationship: string
  email: string
  phone: string
}

export const relationshipConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  "support-coordinator": { label: "Support Coordinator", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "general-practitioner": { label: "General Practitioner", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "pharmacy": { label: "Pharmacy", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "mental-health": { label: "Mental Health", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "physiotherapist": { label: "Physiotherapist", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "decision-maker-opg": { label: "Decision Maker/OPG", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "public-trustee": { label: "Public Trustee", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "next-of-kin": { label: "Next of Kin", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "consumables": { label: "Consumables", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "cas-provider": { label: "CAS Provider", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
  "sil-provider": { label: "SIL Provider", bg: "bg-transparent", text: "text-[#262626]", border: "border-[#dcdcdc]" },
}

export const clientNames = ["Rappi", "Content-mobbin", "Lovi", "Anthropic"]

interface ContactsContextType {
  contacts: Contact[]
  addContact: (contact: Omit<Contact, "id">) => void
  getContactsForClient: (clientName: string) => Contact[]
}

const ContactsContext = createContext<ContactsContextType | null>(null)

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([
    { id: "mock-1", name: "Dr. Sarah Mitchell", clientName: "Rappi", relationship: "general-practitioner", email: "sarah.mitchell@medical.com.au", phone: "07 3456 7890" },
    { id: "mock-2", name: "James Cooper", clientName: "Rappi", relationship: "next-of-kin", email: "james.cooper@email.com", phone: "0412 987 654" },
    { id: "mock-3", name: "Linda Tran", clientName: "Content-mobbin", relationship: "support-coordinator", email: "linda.tran@supportworks.com.au", phone: "0423 111 222" },
    { id: "mock-4", name: "Mark Sullivan", clientName: "Lovi", relationship: "physiotherapist", email: "mark.sullivan@physio.com.au", phone: "07 3890 1234" },
    { id: "mock-5", name: "Angela Peters", clientName: "Anthropic", relationship: "mental-health", email: "angela.peters@mindcare.com.au", phone: "0434 555 666" },
    { id: "mock-6", name: "David Nguyen", clientName: "Rappi", relationship: "pharmacy", email: "david.nguyen@chemist.com.au", phone: "07 3222 4567" },
    { id: "mock-7", name: "Karen Holmes", clientName: "Lovi", relationship: "decision-maker-opg", email: "karen.holmes@opg.qld.gov.au", phone: "07 3100 2000" },
    { id: "mock-8", name: "Peter Grant", clientName: "Content-mobbin", relationship: "sil-provider", email: "peter.grant@silservices.com.au", phone: "0445 333 444" },
    { id: "mock-9", name: "Rebecca Ward", clientName: "Anthropic", relationship: "cas-provider", email: "rebecca.ward@cas.com.au", phone: "07 3678 9012" },
    { id: "mock-10", name: "Tom Bradley", clientName: "Lovi", relationship: "consumables", email: "tom.bradley@supplies.com.au", phone: "0456 777 888" },
  ])

  const addContact = useCallback((contact: Omit<Contact, "id">) => {
    setContacts((prev) => [...prev, { ...contact, id: crypto.randomUUID() }])
  }, [])

  const getContactsForClient = useCallback((clientName: string) => {
    return contacts.filter((c) => c.clientName === clientName)
  }, [contacts])

  return (
    <ContactsContext.Provider value={{ contacts, addContact, getContactsForClient }}>
      {children}
    </ContactsContext.Provider>
  )
}

export function useContacts() {
  const context = useContext(ContactsContext)
  if (!context) throw new Error("useContacts must be used within a ContactsProvider")
  return context
}
