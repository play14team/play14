"use client"

import type { PropsWithChildren } from "react"
import type { Pagination } from "@/models/strapi"
import Paging from "../layout/paging"

interface PaginationProps extends PropsWithChildren {
  pagination: Pagination
}

export default function PagingProvider({ pagination, children }: PaginationProps) {
  return (
    <>
      <Paging pagination={pagination} onNextPage={() => {}} />
      {children}
      <Paging pagination={pagination} onNextPage={() => {}} />
    </>
  )
}
