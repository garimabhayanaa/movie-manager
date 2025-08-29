'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/database';
import { tmdb } from '@/lib/tmdb';
import { 
  Calendar, 
  Plus, 
  Bell, 
  Clock,
  Film,
  Star,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isToday,
  addDays
} from 'date-fns';

interface MovieReminder {
  id: string;
  userId: string;
  movieId: number;
  movieTitle: string;
  moviePoster?: string;
  reminderDate: Date;
  reminderType: 'release' | 'watch' | 'custom';
  isEnabled: boolean;
  notificationSent: boolean;
  createdAt: Date;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'reminder' | 'release' | 'watched';
  movieId?: number;
  poster?: string;
}

const MovieCalendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reminders, setReminders] = useState<MovieReminder[]>([]);
  const [upcomingReleases, setUpcomingReleases] = useState<any[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCalendarData();
    }
  }, [user, currentDate]);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const loadCalendarData = async () => {
    try {
      await Promise.all([
        loadUserReminders(),
        loadUpcomingReleases(),
        loadUserActivity()
      ]);
      generateCalendarEvents();
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserReminders = async () => {
    if (!user) return;
    
    try {
      // Mock reminder data - in real app, would fetch from Firestore
      const mockReminders: MovieReminder[] = [
        {
          id: '1',
          userId: user.uid,
          movieId: 123,
          movieTitle: 'Dune: Part Three',
          reminderDate: addDays(new Date(), 7),
          reminderType: 'release',
          isEnabled: true,
          notificationSent: false,
          createdAt: new Date()
        },
        {
          id: '2',
          userId: user.uid,
          movieId: 456,
          movieTitle: 'The Batman 2',
          reminderDate: addDays(new Date(), 30),
          reminderType: 'release',
          isEnabled: true,
          notificationSent: false,
          createdAt: new Date()
        }
      ];
      setReminders(mockReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const loadUpcomingReleases = async () => {
    try {
      // Get upcoming movies from TMDB
      const today = format(new Date(), 'yyyy-MM-dd');
      const nextMonth = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
      
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&primary_release_date.gte=${today}&primary_release_date.lte=${nextMonth}&sort_by=primary_release_date.asc`
      );
      const data = await response.json();
      setUpcomingReleases(data.results.slice(0, 10));
    } catch (error) {
      console.error('Error loading upcoming releases:', error);
    }
  };

  const loadUserActivity = async () => {
    // Load user's watched movies to show on calendar
    if (!user) return;
    
    try {
      const userMovies = await database.getUserMovies(user.uid);
      const watchedThisMonth = userMovies.filter(movie => {
        const watchDate = new Date(movie.watchedDate || movie.createdAt);
        return isSameMonth(watchDate, currentDate);
      });
      
      // These will be added to events
    } catch (error) {
      console.error('Error loading user activity:', error);
    }
  };

  const generateCalendarEvents = () => {
    const calendarEvents: CalendarEvent[] = [];
    
    // Add reminders as events
    reminders.forEach(reminder => {
      if (isSameMonth(reminder.reminderDate, currentDate)) {
        calendarEvents.push({
          id: reminder.id,
          title: reminder.movieTitle,
          date: reminder.reminderDate,
          type: 'reminder',
          movieId: reminder.movieId,
          poster: reminder.moviePoster
        });
      }
    });
    
    // Add upcoming releases
    upcomingReleases.forEach(movie => {
      if (movie.release_date) {
        const releaseDate = parseISO(movie.release_date);
        if (isSameMonth(releaseDate, currentDate)) {
          calendarEvents.push({
            id: `release_${movie.id}`,
            title: `${movie.title} releases`,
            date: releaseDate,
            type: 'release',
            movieId: movie.id,
            poster: movie.poster_path
          });
        }
      }
    });
    
    setEvents(calendarEvents);
  };

  const addReminder = async (movieId: number, movieTitle: string, reminderDate: Date, type: MovieReminder['reminderType']) => {
    if (!user) return;
    
    try {
      const newReminder: Omit<MovieReminder, 'id'> = {
        userId: user.uid,
        movieId,
        movieTitle,
        reminderDate,
        reminderType: type,
        isEnabled: true,
        notificationSent: false,
        createdAt: new Date()
      };
      
      // In real app, would save to Firestore
      const reminderId = Date.now().toString();
      setReminders([...reminders, { ...newReminder, id: reminderId }]);
      
      // Schedule notification
      scheduleNotification(newReminder, reminderId);
      
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  };

  const scheduleNotification = (reminder: Omit<MovieReminder, 'id'>, reminderId: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const timeUntilReminder = reminder.reminderDate.getTime() - new Date().getTime();
      
      if (timeUntilReminder > 0) {
        setTimeout(() => {
          new Notification(`🎬 Movie Reminder: ${reminder.movieTitle}`, {
            body: `Don't forget about ${reminder.movieTitle}!`,
            icon: '/icons/movie-icon.png',
            tag: reminderId
          });
        }, timeUntilReminder);
      }
    }
  };

  const exportToCalendar = (event: CalendarEvent) => {
    // Generate calendar file for download
    const startDate = format(event.date, "yyyyMMdd'T'HHmmss'Z'");
    const endDate = format(addDays(event.date, 0), "yyyyMMdd'T'HHmmss'Z'");
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Movie Manager//Movie Calendar//EN
BEGIN:VEVENT
UID:${event.id}@moviemanager.app
DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${event.title}
DESCRIPTION:${event.type === 'release' ? 'Movie release date' : 'Movie reminder'}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const CalendarDay = ({ date, events }: { date: Date, events: CalendarEvent[] }) => {
    const isCurrentMonth = isSameMonth(date, currentDate);
    const isSelectedDate = selectedDate && isSameDay(date, selectedDate);
    const isTodayDate = isToday(date);
    
    return (
      <div
        onClick={() => setSelectedDate(date)}
        className={`min-h-24 p-2 border border-gray-200 cursor-pointer transition ${
          isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400'
        } ${isSelectedDate ? 'ring-2 ring-primary' : ''} ${
          isTodayDate ? 'bg-blue-50 border-blue-300' : ''
        }`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className={`text-sm font-medium ${isTodayDate ? 'text-blue-600' : ''}`}>
            {format(date, 'd')}
          </span>
          {isTodayDate && (
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          )}
        </div>
        
        <div className="space-y-1">
          {events.slice(0, 2).map(event => (
            <div
              key={event.id}
              className={`text-xs px-1 py-0.5 rounded truncate ${
                event.type === 'reminder' ? 'bg-yellow-100 text-yellow-800' :
                event.type === 'release' ? 'bg-green-100 text-green-800' :
                'bg-blue-100 text-blue-800'
              }`}
              title={event.title}
            >
              {event.title}
            </div>
          ))}
          {events.length > 2 && (
            <div className="text-xs text-gray-500">
              +{events.length - 2} more
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="bg-gray-300 h-8 w-64 rounded"></div>
          <div className="bg-gray-300 h-96 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Movie Calendar</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowReminderModal(true)}
            className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Reminder</span>
          </button>
          <button className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border">
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 border-b">
                  {day}
                </div>
              ))}
              
              {/* Calendar Days */}
              {getDaysInMonth().map(date => (
                <CalendarDay
                  key={date.toString()}
                  date={date}
                  events={getEventsForDate(date)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Date Events */}
          {selectedDate && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">
                {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              
              {getEventsForDate(selectedDate).length > 0 ? (
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="flex items-start space-x-3">
                      {event.poster && (
                        <img
                          src={tmdb.getImageUrl(event.poster, 'w92')}
                          alt={event.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-gray-600">
                          {event.type === 'reminder' ? 'Reminder' :
                           event.type === 'release' ? 'Release Date' :
                           'Watched'}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <button
                            onClick={() => exportToCalendar(event)}
                            className="text-xs text-primary hover:underline"
                          >
                            Export to Calendar
                          </button>
                          {event.movieId && (
                            <button
                              onClick={() => window.open(`/movie/${event.movieId}`, '_blank')}
                              className="text-xs text-primary hover:underline"
                            >
                              View Movie
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No events on this date</p>
              )}
            </div>
          )}

          {/* Upcoming Reminders */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Bell className="h-5 w-5 mr-2 text-primary" />
              Upcoming Reminders
            </h3>
            
            {reminders.length > 0 ? (
              <div className="space-y-3">
                {reminders.slice(0, 5).map(reminder => (
                  <div key={reminder.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{reminder.movieTitle}</p>
                      <p className="text-xs text-gray-600">
                        {format(reminder.reminderDate, 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => exportToCalendar({
                          id: reminder.id,
                          title: reminder.movieTitle,
                          date: reminder.reminderDate,
                          type: 'reminder',
                          movieId: reminder.movieId
                        })}
                        className="text-primary hover:text-secondary"
                        title="Export to calendar"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No upcoming reminders</p>
            )}
          </div>

          {/* Upcoming Releases */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Film className="h-5 w-5 mr-2 text-primary" />
              Upcoming Releases
            </h3>
            
            <div className="space-y-3">
              {upcomingReleases.slice(0, 5).map(movie => (
                <div key={movie.id} className="flex items-center space-x-3">
                  <img
                    src={tmdb.getImageUrl(movie.poster_path, 'w92')}
                    alt={movie.title}
                    className="w-8 h-12 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{movie.title}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <span>{format(parseISO(movie.release_date), 'MMM d')}</span>
                      <Star className="h-3 w-3" />
                      <span>{movie.vote_average.toFixed(1)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => addReminder(movie.id, movie.title, parseISO(movie.release_date), 'release')}
                    className="text-primary hover:text-secondary"
                    title="Set reminder"
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieCalendar;
