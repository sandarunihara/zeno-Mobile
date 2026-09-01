import { axiosClient } from './axiosClient';

export interface MoodLog {
  id: number;
  userId: string;
  energyScore: number;
  sentiment?: string | null;
  dataSource: string; 
  loggedAt: string; 
  isLight: boolean;
}

export interface MoodlogResponse {
    success: boolean;
    moodLog: MoodLog;
    message: string;
}

export interface Task {
  id: number;
  userId: string; // UUID is handled as a string in TS
  title: string;
  description?: string; // Optional because it can be null
  effort_level: string; 
  deadline?: string | null;    // ISO-8601 string format (e.g., "2026-04-23T19:40:00")
  startTime?: string | null;
  estimatedTime?: number | null;
  is_critical: boolean;
  status: string;
  parentTaskId?: number | null;
  hasMicroSteps: boolean;
  microSteps?: Task[] | null;
  isFromCalender?: boolean;
  calenderEventId?: string;
  calenderEventEtag?: string;
}

export interface DashboardResponse {
  currentEnergyScore: number;
  empatheticMessage: string;
  askConsent: boolean;
  displayTasks: Task[];
}

export interface AiTranscriptRequest {
  transcript: string;
}

export interface AiTAskResponce{
    success: boolean;
    message: string;
    data: Task[];
}

export interface TaskDetailResponse {
  success: boolean;
  task: Task;
  microSteps: Task[] | null;
  parentTask: Task | null;
  message: string;
}

export interface ManualTaskRequest {
    title: string;
    description?: string;
    effortLevel: string;
    deadline?: string | null;
    startTime?: string | null;
    estimatedTime?: number | null;
    isCritical: boolean;
    status: string;
}

export interface FreeTimeSlot {
  from: string;
  to: string;
  durationInMinutes: number;
}

export interface FreeTimeResponse {
  freeTimeSlots: FreeTimeSlot[];
  totalFreeTimeInMinutes: number;
}

export interface TaskResponce {
    success: boolean;
    task: Task;
    message: string;
}

export const dashboardApi = {
    getMoodlog: async (): Promise<MoodlogResponse> =>{
        const response = await axiosClient.get<MoodlogResponse>('/api/core/mood/latest');
        return response.data;
    },

    createorupdateMoodlog: async (mood: number,isLight: boolean): Promise<MoodlogResponse> =>{
        const response = await axiosClient.post<MoodlogResponse>(`/api/core/mood/create/${mood}/${isLight}`);
        
        return response.data;
    },

    getDashboardTasks: async (keepItLight?: boolean): Promise<DashboardResponse> => {
        const response = await axiosClient.get<DashboardResponse>('/api/core/tasks/dashboard', {
            params: { 
                keepItLight 
            }
        });
        return response.data;
    },
    
    createTaskFromTranscript: async (transcript: string): Promise<AiTAskResponce> => {
        const payload: AiTranscriptRequest = { transcript };
        const response = await axiosClient.post<AiTAskResponce>('/api/core/tasks/ai-transcript', payload);
        return response.data;
    },

    getAllTasks: async (): Promise<Task[]> => {
        const response = await axiosClient.get<Task[]>('/api/core/tasks/all');
        return response.data;
    },

    getTaskById: async (id: number): Promise<TaskDetailResponse> => {
        const response = await axiosClient.get<TaskDetailResponse>(`/api/core/tasks/${id}`);
        return response.data;
    },

    getTodaysFreeTime: async (): Promise<FreeTimeResponse> => {
        const response = await axiosClient.get<FreeTimeResponse>('/api/core/tasks/freetime');
        return response.data;
    },

    updateTask: async (id: number, request: ManualTaskRequest): Promise<TaskResponce> => {
        const response = await axiosClient.post<TaskResponce>(`/api/core/tasks/updatetask/${id}`, request);
        console.log(response.data);
        
        return response.data;
    },

    completeTask: async (id: number): Promise<TaskResponce> => {
        const response = await axiosClient.post<TaskResponce>(`/api/core/tasks/completetask/${id}`);
        return response.data;
    },

    createManualTask: async (request: ManualTaskRequest): Promise<TaskResponce> => {
        const response = await axiosClient.post<TaskResponce>('/api/core/tasks/manual', request);
        return response.data;
    },

    deleteTask: async (id: number): Promise<TaskResponce> => {
        const response = await axiosClient.get<TaskResponce>(`/api/core/tasks/deletetask/${id}`);
        return response.data;
    }
};