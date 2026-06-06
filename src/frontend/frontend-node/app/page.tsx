"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Dashboard } from "@/components/pages/dashboard"
import { CaseList } from "@/components/pages/case-list"
import { CaseDetail } from "@/components/pages/case-detail"
import { StudyDetail } from "@/components/pages/study-detail"
import { Statistics } from "@/components/pages/statistics"
import { CreateCaseModal } from "@/components/modals/create-case-modal"
import { CreateStudyModal } from "@/components/modals/create-study-modal"

type PageType = "dashboard" | "caseList" | "caseDetail" | "studyDetail" | "statistics"

const pageTitles: Record<PageType, string> = {
  dashboard: "工作台",
  caseList: "病例管理",
  caseDetail: "病例详情",
  studyDetail: "检查详情",
  statistics: "统计分析",
}

export default function MediVisionApp() {
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard")
  const [selectedCaseId, setSelectedCaseId] = useState<string>("")
  const [selectedStudyId, setSelectedStudyId] = useState<string>("")
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const role = sessionStorage.getItem('role');

    if (!token) {
      window.location.href = '/login';
      return;
    }

    if (role !== 'doctor') {
      sessionStorage.clear();
      window.location.href = '/login';
      return;
    }

    const savedPage = sessionStorage.getItem('currentPage') as PageType;
    const savedCaseId = sessionStorage.getItem('selectedCaseId');
    const savedStudyId = sessionStorage.getItem('selectedStudyId');

    if (savedPage) setCurrentPage(savedPage);
    if (savedCaseId) setSelectedCaseId(savedCaseId);
    if (savedStudyId) setSelectedStudyId(savedStudyId);
    setIsInitialized(true);
  }, [])

  useEffect(() => {
    if (isInitialized) {
      sessionStorage.setItem('currentPage', currentPage);
    }
  }, [currentPage, isInitialized]);

  useEffect(() => {
    if (isInitialized && selectedCaseId) {
      sessionStorage.setItem('selectedCaseId', selectedCaseId);
    }
  }, [selectedCaseId, isInitialized]);

  useEffect(() => {
    if (isInitialized && selectedStudyId) {
      sessionStorage.setItem('selectedStudyId', selectedStudyId);
    }
  }, [selectedStudyId, isInitialized]);
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false)
  const [isCreateStudyModalOpen, setIsCreateStudyModalOpen] = useState(false)
  const [refreshCaseDetail, setRefreshCaseDetail] = useState<boolean>(false)
  const [refreshCaseList, setRefreshCaseList] = useState<boolean>(false)

  useEffect(() => {
    if (selectedCaseId) {
      sessionStorage.setItem('selectedCaseId', selectedCaseId);
    }
  }, [selectedCaseId]);

  useEffect(() => {
    if (selectedStudyId) {
      sessionStorage.setItem('selectedStudyId', selectedStudyId);
    }
  }, [selectedStudyId]);

  const handleNavigate = (page: PageType) => {
    setCurrentPage(page)
  }

  const handleShowCaseDetail = (caseId: string) => {
    setSelectedCaseId(caseId)
    setCurrentPage("caseDetail")
  }

  const handleShowStudyDetail = (studyId: string) => {
    setSelectedStudyId(studyId)
    setCurrentPage("studyDetail")
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <Dashboard
            onShowCreateCase={() => setIsCreateCaseModalOpen(true)}
            onShowCaseList={() => setCurrentPage("caseList")}
            onShowStatistics={() => setCurrentPage("statistics")}
          />
        )
      case "caseList":
        return (
          <CaseList
            onShowCreateCase={() => setIsCreateCaseModalOpen(true)}
            onShowCaseDetail={handleShowCaseDetail}
            refresh={refreshCaseList}
          />
        )
      case "caseDetail":
        return (
          <CaseDetail
            caseId={selectedCaseId}
            onShowCaseList={() => setCurrentPage("caseList")}
            onShowStudyDetail={handleShowStudyDetail}
            onCreateStudy={() => setIsCreateStudyModalOpen(true)}
            key={refreshCaseDetail ? Math.random() : selectedCaseId}
          />
        )
      case "studyDetail":
        return (
          <StudyDetail
            studyId={selectedStudyId}
            onShowCaseList={() => setCurrentPage("caseList")}
            onShowCaseDetail={handleShowCaseDetail}
          />
        )
      case "statistics":
        return <Statistics />
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
      
      <main className="flex-1 flex flex-col overflow-y-auto">
        <Header title={pageTitles[currentPage]} />
        {renderPage()}
      </main>

      <CreateCaseModal
        isOpen={isCreateCaseModalOpen}
        onClose={() => setIsCreateCaseModalOpen(false)}
        onSuccess={() => {
          setIsCreateCaseModalOpen(false)
          setRefreshCaseList(prev => !prev)
          setCurrentPage("caseList")
        }}
      />
      
      <CreateStudyModal
        isOpen={isCreateStudyModalOpen}
        onClose={() => setIsCreateStudyModalOpen(false)}
        onSuccess={() => {
          setIsCreateStudyModalOpen(false)
          setRefreshCaseDetail(prev => !prev)
        }}
        caseId={selectedCaseId}
      />
    </div>
  )
}
