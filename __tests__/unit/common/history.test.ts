import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mergeHistory, getLocalHistory } from '~/common/history'
import type { HistoryItem } from '~/common/types'

describe('mergeHistory', () => {
  it('应该合并本地和远程历史记录，累加访问次数并取最新的访问时间', () => {
    const local: HistoryItem[] = [
      { id: '1', url: 'https://example.com', lastVisitTime: 1000, visitCount: 1 },
      { id: '2', url: 'https://test.com', lastVisitTime: 2000, visitCount: 1 },
    ]
    const remote: HistoryItem[] = [
      { id: '1', url: 'https://example.com', lastVisitTime: 3000, visitCount: 2 },
      { id: '3', url: 'https://new.com', lastVisitTime: 1500, visitCount: 1 },
    ]

    const result = mergeHistory(local, remote)

    expect(result.totalItems).toBe(3)
    expect(result.localOnly).toBe(1)
    expect(result.remoteOnly).toBe(1)
    expect(result.updated).toBe(1)
    const exampleItem = result.items.find(item => item.url === 'https://example.com')
    expect(exampleItem?.lastVisitTime).toBe(3000)
    expect(exampleItem?.visitCount).toBe(3)
  })

  it('当本地记录更新时应该正确合并', () => {
    const local: HistoryItem[] = [
      { id: '1', url: 'https://example.com', lastVisitTime: 3000, visitCount: 3 },
    ]
    const remote: HistoryItem[] = [
      { id: '1', url: 'https://example.com', lastVisitTime: 1000, visitCount: 1 },
    ]

    const result = mergeHistory(local, remote)

    expect(result.totalItems).toBe(1)
    expect(result.items[0].lastVisitTime).toBe(3000)
    expect(result.items[0].visitCount).toBe(4)
  })

  it('应该按访问时间降序排序', () => {
    const local: HistoryItem[] = [
      { id: '1', url: 'https://a.com', lastVisitTime: 1000, visitCount: 1 },
    ]
    const remote: HistoryItem[] = [
      { id: '2', url: 'https://b.com', lastVisitTime: 3000, visitCount: 1 },
      { id: '3', url: 'https://c.com', lastVisitTime: 2000, visitCount: 1 },
    ]

    const result = mergeHistory(local, remote)

    expect(result.items[0].url).toBe('https://b.com')
    expect(result.items[1].url).toBe('https://c.com')
    expect(result.items[2].url).toBe('https://a.com')
  })

  it('应该处理空数组', () => {
    const local: HistoryItem[] = []
    const remote: HistoryItem[] = [
      { id: '1', url: 'https://example.com', lastVisitTime: 1000, visitCount: 1 },
    ]

    const result = mergeHistory(local, remote)

    expect(result.totalItems).toBe(1)
    expect(result.localOnly).toBe(0)
    expect(result.remoteOnly).toBe(1)
    expect(result.updated).toBe(0)
    expect(result.items[0].url).toBe('https://example.com')
  })

  it('应该处理两个空数组', () => {
    const result = mergeHistory([], [])
    expect(result.totalItems).toBe(0)
    expect(result.items).toHaveLength(0)
  })

  it('应该保留非空的标题', () => {
    const local: HistoryItem[] = [
      {
        id: '1',
        url: 'https://example.com',
        lastVisitTime: 1000,
        visitCount: 1,
        title: 'Local Title',
      },
    ]
    const remote: HistoryItem[] = [
      {
        id: '1',
        url: 'https://example.com',
        lastVisitTime: 2000,
        visitCount: 1,
        title: 'Remote Title',
      },
    ]

    const result = mergeHistory(local, remote)

    expect(result.items[0].title).toBe('Remote Title')
  })

  it('当远程标题为空时应该保留本地标题', () => {
    const local: HistoryItem[] = [
      {
        id: '1',
        url: 'https://example.com',
        lastVisitTime: 1000,
        visitCount: 1,
        title: 'Local Title',
      },
    ]
    const remote: HistoryItem[] = [
      { id: '1', url: 'https://example.com', lastVisitTime: 2000, visitCount: 1 },
    ]

    const result = mergeHistory(local, remote)

    expect(result.items[0].title).toBe('Local Title')
  })
})

describe('getLocalHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该调用 chrome.history.search', async () => {
    const mockItems = [
      { id: '1', url: 'https://example.com', title: 'Example', lastVisitTime: 1000, visitCount: 1 },
    ]
    const mockSearch = vi.fn((_query, callback) => {
      callback(mockItems)
    }) as unknown as typeof chrome.history.search
    chrome.history.search = mockSearch

    const result = await getLocalHistory()
    expect(mockSearch).toHaveBeenCalledWith(
      {
        text: '',
        startTime: 0,
        maxResults: 1000,
      },
      expect.any(Function)
    )
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://example.com')
  })

  it('当 chrome.history 不可用时应该抛出错误', async () => {
    const originalHistory = chrome.history
    chrome.history = undefined as unknown as typeof chrome.history
    await expect(getLocalHistory()).rejects.toThrow('History API is not available')
    chrome.history = originalHistory
  })

  it('应该处理 chrome.runtime.lastError', async () => {
    const mockSearch = vi.fn((_query, callback) => {
      chrome.runtime.lastError = { message: 'Test error' }
      callback([])
    }) as unknown as typeof chrome.history.search
    chrome.history.search = mockSearch

    await expect(getLocalHistory()).rejects.toThrow('Test error')
    chrome.runtime.lastError = undefined
  })

  it('应该处理空 URL', async () => {
    const mockItems = [
      { id: '1', url: undefined, title: 'No URL', lastVisitTime: 1000, visitCount: 1 },
    ]
    const mockSearch = vi.fn((_query, callback) => {
      callback(mockItems)
    }) as unknown as typeof chrome.history.search
    chrome.history.search = mockSearch

    const result = await getLocalHistory()
    expect(result[0].url).toBe('')
  })
})
